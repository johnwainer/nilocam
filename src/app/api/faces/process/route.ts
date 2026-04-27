// POST /api/faces/process
// Body: { eventId, photoId, descriptor: number[], bbox: {...} }
// Called from the browser after client-side detection. Stores the face cluster
// and auto-assigns it to an existing person if a match is found (via centroid comparison).

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

const MATCH_THRESHOLD = 0.48; // centroid comparison — slightly stricter than raw descriptor
const DUPLICATE_THRESHOLD = 0.15; // same face submitted twice

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function computeCentroid(descriptors: number[][]): number[] {
  const n = descriptors.length;
  const c = new Array(128).fill(0) as number[];
  for (const d of descriptors) {
    for (let i = 0; i < 128; i++) c[i] += d[i];
  }
  return c.map((v) => v / n);
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

  // Check for duplicate: same face already stored in this photo (descriptor distance < 0.15)
  const { data: photoFaces } = await admin
    .from("face_clusters")
    .select("id, descriptor")
    .eq("photo_id", photoId);

  if (photoFaces && photoFaces.some((f) => {
    if (!f.descriptor) return false;
    return euclidean(descriptor, f.descriptor as number[]) < DUPLICATE_THRESHOLD;
  })) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fetch all existing faces for this event grouped by person (for centroid computation)
  const { data: allFaces } = await admin
    .from("face_clusters")
    .select("person_id, descriptor")
    .eq("event_id", eventId)
    .not("person_id", "is", null);

  // Build centroid per person
  const personDescriptors = new Map<string, number[][]>();
  for (const face of allFaces ?? []) {
    if (!face.descriptor || !face.person_id) continue;
    const pid = face.person_id as string;
    if (!personDescriptors.has(pid)) personDescriptors.set(pid, []);
    personDescriptors.get(pid)!.push(face.descriptor as number[]);
  }

  let matchedPersonId: string | null = null;
  let bestDistance = Infinity;

  for (const [pid, descriptors] of personDescriptors) {
    const centroid = computeCentroid(descriptors);
    const d = euclidean(descriptor, centroid);
    if (d < MATCH_THRESHOLD && d < bestDistance) {
      bestDistance = d;
      matchedPersonId = pid;
    }
  }

  // No match → create a new unnamed person
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

  // Update face_count
  await admin.rpc("increment_person_face_count", { p_person_id: matchedPersonId });

  return NextResponse.json({ ok: true, faceId: faceRow.id, personId: matchedPersonId });
}
