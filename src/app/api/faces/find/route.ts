// POST /api/faces/find
// Body: { eventId, descriptor: number[] }
// Returns photo IDs that contain a face matching the given descriptor.
// Used for "find my photos" selfie search.

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

const MATCH_THRESHOLD = 0.52; // slightly more lenient for selfie search

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export async function POST(request: Request) {
  const body = await request.json() as { eventId?: string; descriptor?: number[] };
  const { eventId, descriptor } = body;

  if (!eventId || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const admin = serviceClient();

  // Fetch all faces for this event that are linked to approved photos
  const { data: faces, error } = await admin
    .from("face_clusters")
    .select("id, photo_id, descriptor, photos!inner(moderation_status)")
    .eq("event_id", eventId)
    .eq("photos.moderation_status", "approved");

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const matchedPhotoIds = new Set<string>();

  for (const face of faces ?? []) {
    if (!face.descriptor) continue;
    const d = euclidean(descriptor, face.descriptor as number[]);
    if (d < MATCH_THRESHOLD) {
      matchedPhotoIds.add(face.photo_id);
    }
  }

  return NextResponse.json({ ok: true, photoIds: [...matchedPhotoIds] });
}
