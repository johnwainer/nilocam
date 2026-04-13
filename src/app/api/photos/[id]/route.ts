import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { EVENT_BUCKET } from "@/lib/constants";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function verifyPhotoAccess(photoId: string, userEmail: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const admin = serviceClient();

  const [{ data: photo }, { data: profile }] = await Promise.all([
    admin
      .from("photos")
      .select("*, events(owner_email)")
      .eq("id", photoId)
      .single(),
    admin.from("profiles").select("role").eq("email", userEmail).single(),
  ]);

  if (!photo) return null;

  const eventOwner = (photo.events as { owner_email: string } | null)?.owner_email;
  const isOwner = eventOwner === userEmail;
  const isSuperAdmin = profile?.role === "super_admin";

  if (!isOwner && !isSuperAdmin) return null;

  return { admin, photo };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { status?: string };
  if (!["approved", "rejected", "pending"].includes(body.status ?? "")) {
    return NextResponse.json({ ok: false, message: "Estado inválido." }, { status: 400 });
  }

  const auth = await verifyPhotoAccess(id, user.email);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  const { error } = await auth.admin
    .from("photos")
    .update({ moderation_status: body.status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const auth = await verifyPhotoAccess(id, user.email);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  const { photo, admin } = auth;

  // Remove file from storage
  if (photo.storage_path) {
    await admin.storage.from(EVENT_BUCKET).remove([photo.storage_path]);
  }

  // Delete DB record
  const { error } = await admin.from("photos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
