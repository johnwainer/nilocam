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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, message: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const admin = serviceClient();

  const [{ data: event }, { data: profile }] = await Promise.all([
    admin.from("events").select("owner_email").eq("id", id).single(),
    admin.from("profiles").select("role").eq("email", user.email).single(),
  ]);

  const isOwner = event?.owner_email === user.email;
  const isSuperAdmin = profile?.role === "super_admin";

  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  // Delete all photo files from storage before deleting the event
  const { data: photos } = await admin
    .from("photos")
    .select("storage_path")
    .eq("event_id", id);

  if (photos && photos.length > 0) {
    const paths = photos
      .map((p: { storage_path: string }) => p.storage_path)
      .filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from(EVENT_BUCKET).remove(paths);
    }
  }

  // Delete the event record (cascade deletes photo rows)
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
