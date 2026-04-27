// GET  /api/events/[id]/persons  — admin: full person list with faces
// POST /api/events/[id]/persons  — admin: create a named person manually

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicStorageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

async function isEventOwner(admin: ReturnType<typeof serviceClient>, eventId: string, email: string): Promise<boolean> {
  const { data } = await admin
    .from("events")
    .select("owner_email")
    .eq("id", eventId)
    .single();
  if (!data) return false;
  const SUPER = process.env.SUPER_ADMIN_EMAIL;
  return data.owner_email === email || (!!SUPER && email === SUPER);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = serviceClient();
  if (!(await isEventOwner(admin, eventId, email))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { data: persons, error } = await admin
    .from("persons")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // For each person, fetch their faces (with photo storage paths)
  const enriched = await Promise.all(
    (persons ?? []).map(async (person) => {
      const { data: faces } = await admin
        .from("face_clusters")
        .select("id, photo_id, descriptor, bbox, photos(storage_path)")
        .eq("person_id", person.id)
        .limit(20);

      return {
        ...person,
        faces: (faces ?? []).map((f) => ({
          ...f,
          photo_public_url: f.photos
            ? publicStorageUrl((f.photos as unknown as { storage_path: string }).storage_path)
            : null,
        })),
      };
    })
  );

  return NextResponse.json({ ok: true, persons: enriched });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = serviceClient();
  if (!(await isEventOwner(admin, eventId, email))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await request.json() as { display_name?: string; instagram?: string; tiktok?: string };
  const display_name = typeof body.display_name === "string" ? body.display_name.slice(0, 100) : null;
  const instagram = typeof body.instagram === "string" ? body.instagram.slice(0, 60) : null;
  const tiktok = typeof body.tiktok === "string" ? body.tiktok.slice(0, 60) : null;

  const { data, error } = await admin
    .from("persons")
    .insert({ event_id: eventId, display_name, instagram, tiktok })
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, person: data });
}
