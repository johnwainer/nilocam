import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { PaymentSettings } from "@/types";

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
  const { data: profile } = await admin.from("profiles").select("role").eq("email", user.email).single();
  return profile?.role === "super_admin" ? user : null;
}

// GET /api/admin/payment-settings — full settings including secrets (super admin only)
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const admin = serviceClient();
  const { data, error } = await admin.from("payment_settings").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, settings: data });
}

// POST /api/admin/payment-settings — update settings (super admin only)
export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as Partial<PaymentSettings> & { credit_price_usd?: number };

  // Only allow known fields to prevent injection
  const allowed: (keyof PaymentSettings)[] = [
    "credit_price_usd",
    "stripe_enabled", "stripe_public_key", "stripe_secret_key", "stripe_webhook_secret",
    "paypal_enabled", "paypal_client_id", "paypal_secret", "paypal_sandbox",
    "bank_transfer_enabled", "bank_transfer_info",
  ];

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (
    patch.credit_price_usd !== undefined &&
    (typeof patch.credit_price_usd !== "number" || (patch.credit_price_usd as number) < 0)
  ) {
    return NextResponse.json({ ok: false, message: "Precio inválido." }, { status: 400 });
  }

  const admin = serviceClient();
  const { error } = await admin.from("payment_settings").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
