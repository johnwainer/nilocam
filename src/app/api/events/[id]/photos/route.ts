import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(
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

  const { data: photos, error } = await admin
    .from("photos")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, photos: photos ?? [] });
}
