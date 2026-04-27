// POST /api/persons/merge
// Body: { keepId: string, mergeId: string }
// Moves all face_clusters from mergeId into keepId, then deletes mergeId.

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

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json() as { keepId?: string; mergeId?: string };
  const { keepId, mergeId } = body;
  if (!keepId || !mergeId || keepId === mergeId) {
    return NextResponse.json({ ok: false, message: "keepId y mergeId requeridos y distintos." }, { status: 400 });
  }

  const admin = serviceClient();

  // Verify both persons exist and belong to the same event owned by this user
  const { data: persons } = await admin
    .from("persons")
    .select("id, event_id, events(owner_email)")
    .in("id", [keepId, mergeId]);

  if (!persons || persons.length !== 2) {
    return NextResponse.json({ ok: false, message: "Personas no encontradas." }, { status: 404 });
  }

  const [p1, p2] = persons;
  if (p1.event_id !== p2.event_id) {
    return NextResponse.json({ ok: false, message: "Personas de distintos eventos." }, { status: 400 });
  }

  const ownerEmail = (p1.events as unknown as { owner_email: string | null } | null)?.owner_email;
  const SUPER = process.env.SUPER_ADMIN_EMAIL;
  if (ownerEmail !== email && !(SUPER && email === SUPER)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Move faces from mergeId → keepId
  await admin
    .from("face_clusters")
    .update({ person_id: keepId })
    .eq("person_id", mergeId);

  // Recalculate face_count on keepId
  const { count } = await admin
    .from("face_clusters")
    .select("id", { count: "exact", head: true })
    .eq("person_id", keepId);

  await admin
    .from("persons")
    .update({ face_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", keepId);

  // Delete the merged person
  await admin.from("persons").delete().eq("id", mergeId);

  const { data: updated } = await admin.from("persons").select("*").eq("id", keepId).single();

  return NextResponse.json({ ok: true, person: updated });
}
