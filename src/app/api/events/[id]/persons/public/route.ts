// GET /api/events/[id]/persons/public
// Public endpoint — returns named persons for gallery filter chips.
// Only persons with a display_name are returned.

import { createClient } from "@supabase/supabase-js";
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const admin = serviceClient();

  const { data: persons, error } = await admin
    .from("persons")
    .select("id, display_name, instagram, tiktok, cover_face_id, face_count")
    .eq("event_id", eventId)
    .not("display_name", "is", null)
    .order("display_name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Attach cover photo URL
  const enriched = await Promise.all(
    (persons ?? []).map(async (p) => {
      if (!p.cover_face_id) return { ...p, cover_photo_url: null };
      const { data: face } = await admin
        .from("face_clusters")
        .select("bbox, photos(storage_path)")
        .eq("id", p.cover_face_id)
        .single();
      if (!face || !face.photos) return { ...p, cover_photo_url: null };
      const url = publicStorageUrl((face.photos as unknown as { storage_path: string }).storage_path);
      return { ...p, cover_photo_url: url, cover_bbox: face.bbox };
    })
  );

  return NextResponse.json({ ok: true, persons: enriched });
}
