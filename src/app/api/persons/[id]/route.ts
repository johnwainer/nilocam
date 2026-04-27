// PATCH /api/persons/[id]   — update display_name, instagram, tiktok
// DELETE /api/persons/[id]  — delete person (keeps face_clusters, sets person_id=null)

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

async function canEditPerson(
  admin: ReturnType<typeof serviceClient>,
  personId: string,
  email: string
): Promise<boolean> {
  const { data } = await admin
    .from("persons")
    .select("event_id, events(owner_email)")
    .eq("id", personId)
    .single();
  if (!data) return false;
  const ownerEmail = (data.events as unknown as { owner_email: string | null } | null)?.owner_email;
  const SUPER = process.env.SUPER_ADMIN_EMAIL;
  return ownerEmail === email || (!!SUPER && email === SUPER);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = serviceClient();
  if (!(await canEditPerson(admin, id, email))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await request.json() as {
    display_name?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    cover_face_id?: string | null;
  };

  const patch: Record<string, unknown> = {};
  if ("display_name" in body) patch.display_name = body.display_name ? body.display_name.slice(0, 100) : null;
  if ("instagram" in body) patch.instagram = body.instagram ? body.instagram.slice(0, 60) : null;
  if ("tiktok" in body) patch.tiktok = body.tiktok ? body.tiktok.slice(0, 60) : null;
  if ("cover_face_id" in body) patch.cover_face_id = body.cover_face_id;

  const { data, error } = await admin
    .from("persons")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, person: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = serviceClient();
  if (!(await canEditPerson(admin, id, email))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Unlink faces from this person (keep the faces for re-assignment)
  await admin
    .from("face_clusters")
    .update({ person_id: null })
    .eq("person_id", id);

  const { error } = await admin.from("persons").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
