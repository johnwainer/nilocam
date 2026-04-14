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

// GET /api/admin/pricing — public, anyone can read prices
export async function GET() {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("credit_pricing")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricing: data ?? [] });
}

// PATCH /api/admin/pricing  { key, credits }  — super admin only
export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const admin = serviceClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("email", user.email).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  const body = await request.json() as { key?: string; credits?: number };
  if (!body.key || body.credits === undefined || body.credits < 0) {
    return NextResponse.json({ ok: false, message: "Parámetros inválidos." }, { status: 400 });
  }

  const { error } = await admin
    .from("credit_pricing")
    .update({ credits: body.credits, updated_at: new Date().toISOString() })
    .eq("key", body.key);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
