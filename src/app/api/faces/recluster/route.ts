// POST /api/faces/recluster
// Body: { eventId }
// Iteratively merges person clusters whose centroids are within AUTO_MERGE_THRESHOLD.
// Prefers keeping named persons; among equals, keeps the one with more faces.
// Returns { ok, merged } where merged is the number of clusters eliminated.

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTO_MERGE_THRESHOLD = 0.44;

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
  const { data } = await admin.from("events").select("owner_email").eq("id", eventId).single();
  if (!data) return false;
  const SUPER = process.env.SUPER_ADMIN_EMAIL;
  return data.owner_email === email || (!!SUPER && email === SUPER);
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
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

// Resolves merge chains: A→B→C becomes A→C
function resolve(id: string, mergedInto: Map<string, string>): string {
  let cur = id;
  while (mergedInto.has(cur)) cur = mergedInto.get(cur)!;
  return cur;
}

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json() as { eventId?: string };
  const { eventId } = body;
  if (!eventId) return NextResponse.json({ ok: false, message: "eventId requerido." }, { status: 400 });

  const admin = serviceClient();
  if (!(await isEventOwner(admin, eventId, email))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Load all face descriptors for the event
  const { data: faces, error: facesErr } = await admin
    .from("face_clusters")
    .select("id, person_id, descriptor")
    .eq("event_id", eventId)
    .not("person_id", "is", null)
    .not("descriptor", "is", null);

  if (facesErr) return NextResponse.json({ ok: false, message: facesErr.message }, { status: 500 });

  // Load all persons
  const { data: persons, error: personsErr } = await admin
    .from("persons")
    .select("id, display_name, face_count")
    .eq("event_id", eventId);

  if (personsErr) return NextResponse.json({ ok: false, message: personsErr.message }, { status: 500 });

  if (!faces?.length || !persons?.length) {
    return NextResponse.json({ ok: true, merged: 0 });
  }

  // Group descriptors by person_id
  const personDescs = new Map<string, number[][]>();
  for (const f of faces) {
    const pid = f.person_id as string;
    if (!personDescs.has(pid)) personDescs.set(pid, []);
    personDescs.get(pid)!.push(f.descriptor as number[]);
  }

  // Compute centroids
  const centroids = new Map<string, number[]>();
  for (const [pid, descs] of personDescs) {
    centroids.set(pid, computeCentroid(descs));
  }

  // Build person info map
  const personInfo = new Map(persons.map((p) => [p.id, p] as const));

  // Iterative merge: always merge the closest pair within threshold
  const mergedInto = new Map<string, string>(); // mergeId → keepId
  let changed = true;

  while (changed) {
    changed = false;
    const pids = [...centroids.keys()];
    let bestDist = Infinity;
    let bestPair: [string, string] | null = null;

    for (let i = 0; i < pids.length; i++) {
      for (let j = i + 1; j < pids.length; j++) {
        const d = euclidean(centroids.get(pids[i])!, centroids.get(pids[j])!);
        if (d < AUTO_MERGE_THRESHOLD && d < bestDist) {
          bestDist = d;
          bestPair = [pids[i], pids[j]];
        }
      }
    }

    if (!bestPair) break;

    const [idA, idB] = bestPair;
    const infoA = personInfo.get(idA);
    const infoB = personInfo.get(idB);

    // Keep named over unnamed; among equals, keep the one with more faces
    let keepId: string, mergeId: string;
    const aIsNamed = !!infoA?.display_name;
    const bIsNamed = !!infoB?.display_name;

    if (aIsNamed && !bIsNamed) {
      keepId = idA; mergeId = idB;
    } else if (!aIsNamed && bIsNamed) {
      keepId = idB; mergeId = idA;
    } else {
      const countA = personDescs.get(idA)?.length ?? 0;
      const countB = personDescs.get(idB)?.length ?? 0;
      keepId = countA >= countB ? idA : idB;
      mergeId = countA >= countB ? idB : idA;
    }

    // Merge descriptor sets and recompute centroid
    const merged = [...(personDescs.get(keepId) ?? []), ...(personDescs.get(mergeId) ?? [])];
    personDescs.set(keepId, merged);
    personDescs.delete(mergeId);
    centroids.set(keepId, computeCentroid(merged));
    centroids.delete(mergeId);

    mergedInto.set(mergeId, keepId);
    changed = true;
  }

  if (mergedInto.size === 0) return NextResponse.json({ ok: true, merged: 0 });

  // Apply merges to DB (resolve chains so A→B→C becomes A→C)
  for (const [mergeId] of mergedInto) {
    const finalKeepId = resolve(mergeId, mergedInto);

    await admin
      .from("face_clusters")
      .update({ person_id: finalKeepId })
      .eq("person_id", mergeId);

    // Update face_count on keep
    const { count } = await admin
      .from("face_clusters")
      .select("id", { count: "exact", head: true })
      .eq("person_id", finalKeepId);

    await admin
      .from("persons")
      .update({ face_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", finalKeepId);

    await admin.from("persons").delete().eq("id", mergeId);
  }

  return NextResponse.json({ ok: true, merged: mergedInto.size });
}
