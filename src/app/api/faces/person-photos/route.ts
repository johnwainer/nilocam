// GET /api/faces/person-photos?eventId=&personId=
// Returns photo IDs for approved photos where this person appears.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const personId = searchParams.get("personId");

  if (!eventId || !personId) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const admin = serviceClient();

  const { data, error } = await admin
    .from("face_clusters")
    .select("photo_id, photos!inner(moderation_status)")
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .eq("photos.moderation_status", "approved");

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const photoIds = [...new Set((data ?? []).map((r) => r.photo_id as string))];
  return NextResponse.json({ ok: true, photoIds });
}
