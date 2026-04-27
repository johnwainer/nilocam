// POST /api/faces/process
// Body: { eventId, photoId, storageUrl, descriptor: number[], bbox: {...} }
// Called from the browser after client-side detection. Stores the face cluster
// and auto-assigns it to an existing person if a match is found.

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

const MATCH_THRESHOLD = 0.5;

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

type BBox = { x: number; y: number; width: number; height: number };

export async function POST(request: Request) {
  const body = await request.json() as {
    eventId?: string;
    photoId?: string;
    descriptor?: number[];
    bbox?: BBox;
  };

  const { eventId, photoId, descriptor, bbox } = body;
  if (!eventId || !photoId || !descriptor || !bbox) {
    return NextResponse.json({ ok: false, message: "Faltan campos." }, { status: 400 });
  }
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return NextResponse.json({ ok: false, message: "Descriptor inválido." }, { status: 400 });
  }

  const admin = serviceClient();

  // Check photo belongs to event
  const { data: photo } = await admin
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .single();
  if (!photo) {
    return NextResponse.json({ ok: false, message: "Foto no encontrada." }, { status: 404 });
  }

  // Check for duplicate face in same photo (same bbox area)
  const { data: existing } = await admin
    .from("face_clusters")
    .select("id")
    .eq("photo_id", photoId)
    .limit(50);

  if (existing && existing.length > 0) {
    // Already processed this photo — skip
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fetch all existing face descriptors for this event to find a match
  const { data: allFaces } = await admin
    .from("face_clusters")
    .select("id, person_id, descriptor")
    .eq("event_id", eventId)
    .not("person_id", "is", null);

  let matchedPersonId: string | null = null;

  if (allFaces && allFaces.length > 0) {
    let bestDistance = Infinity;
    let bestPersonId: string | null = null;

    for (const face of allFaces) {
      if (!face.descriptor || !face.person_id) continue;
      const d = euclidean(descriptor, face.descriptor as number[]);
      if (d < MATCH_THRESHOLD && d < bestDistance) {
        bestDistance = d;
        bestPersonId = face.person_id as string;
      }
    }
    matchedPersonId = bestPersonId;
  }

  // If no person matched, create a new unnamed person cluster
  if (!matchedPersonId) {
    const { data: newPerson, error: personErr } = await admin
      .from("persons")
      .insert({ event_id: eventId, display_name: null })
      .select("id")
      .single();
    if (personErr || !newPerson) {
      return NextResponse.json({ ok: false, message: "Error creando persona." }, { status: 500 });
    }
    matchedPersonId = newPerson.id;
  }

  // Insert the face cluster
  const { data: faceRow, error: faceErr } = await admin
    .from("face_clusters")
    .insert({
      event_id: eventId,
      photo_id: photoId,
      person_id: matchedPersonId,
      descriptor,
      bbox,
    })
    .select("id")
    .single();

  if (faceErr) {
    return NextResponse.json({ ok: false, message: faceErr.message }, { status: 500 });
  }

  // Set cover_face_id on person if not set
  await admin
    .from("persons")
    .update({ cover_face_id: faceRow.id })
    .eq("id", matchedPersonId)
    .is("cover_face_id", null);

  // Update face_count on person
  await admin.rpc("increment_person_face_count", { p_person_id: matchedPersonId });

  return NextResponse.json({ ok: true, faceId: faceRow.id, personId: matchedPersonId });
}
