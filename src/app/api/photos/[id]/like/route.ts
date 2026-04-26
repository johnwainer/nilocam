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

// POST /api/photos/[id]/like  { action: "like" | "unlike" }
// Public endpoint — no auth required. Anti-abuse via localStorage on client.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { action?: "like" | "unlike" };
  if (body.action !== "like" && body.action !== "unlike") {
    return NextResponse.json({ ok: false, message: "action debe ser 'like' o 'unlike'." }, { status: 400 });
  }

  const admin = serviceClient();

  const { data: photo, error: fetchErr } = await admin
    .from("photos")
    .select("likes_count, moderation_status")
    .eq("id", id)
    .single();

  if (fetchErr || !photo) {
    return NextResponse.json({ ok: false, message: "Foto no encontrada." }, { status: 404 });
  }
  if (photo.moderation_status !== "approved") {
    return NextResponse.json({ ok: false, message: "Foto no disponible." }, { status: 403 });
  }

  const delta = body.action === "like" ? 1 : -1;
  const newCount = Math.max(0, (photo.likes_count ?? 0) + delta);

  const { error: updateErr } = await admin
    .from("photos")
    .update({ likes_count: newCount })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, likes_count: newCount });
}
