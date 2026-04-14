import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function requireSuperAdmin() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return null;

  const admin = serviceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .single();

  return profile?.role === "super_admin" ? user : null;
}

// PATCH /api/admin/users  { id, role }
export async function PATCH(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  const body = await request.json() as { id?: string; role?: string };
  const { id, role } = body;

  if (!id || !role || !["owner", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ ok: false, message: "Parámetros inválidos." }, { status: 400 });
  }

  const admin = serviceClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
