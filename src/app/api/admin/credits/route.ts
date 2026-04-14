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
  const { data: p } = await admin.from("profiles").select("role").eq("email", user.email).single();
  return p?.role === "super_admin" ? user : null;
}

// PATCH /api/admin/credits  { user_id, user_email, amount, description }
// Manually grant or deduct credits for any user
export async function PATCH(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as {
    user_id?: string;
    user_email?: string;
    amount?: number;
    description?: string;
  };

  const { user_id, user_email, amount, description = "" } = body;
  if (!user_id || !user_email || amount === undefined) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const admin = serviceClient();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", user_id).single();
  if (!profile) return NextResponse.json({ ok: false, message: "Usuario no encontrado." }, { status: 404 });

  const newBalance = Math.max(0, (profile.credits ?? 0) + amount);
  await admin.from("profiles").update({ credits: newBalance }).eq("id", user_id);

  await admin.from("credit_transactions").insert({
    user_id,
    user_email,
    amount,
    type: amount >= 0 ? "manual_grant" : "manual_deduct",
    description: description || (amount >= 0 ? "Créditos otorgados por admin" : "Créditos descontados por admin"),
  });

  return NextResponse.json({ ok: true, credits: newBalance });
}
