import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { PaymentSettings } from "@/types";

export const dynamic = "force-dynamic";

// Sentinel returned when a secret is configured — never expose the real value
const SET = "__SET__";

const SECRET_FIELDS: (keyof PaymentSettings)[] = [
  "stripe_secret_key",
  "stripe_webhook_secret",
  "paypal_secret",
];

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

// GET /api/admin/payment-settings — secrets are masked with "__SET__"
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const admin = serviceClient();
  const { data, error } = await admin.rpc("get_payment_settings");

  if (error || !data) {
    return NextResponse.json({
      ok: false,
      message: error?.message ?? "Error obteniendo configuración. Ejecuta el SQL de add-payment-rpc-functions.sql en Supabase.",
    }, { status: 500 });
  }

  const settings = { stripe_webhook_secret: "", paypal_sandbox: false, ...data };

  // Mask secret values — never send plaintext secrets to the browser
  for (const field of SECRET_FIELDS) {
    if (settings[field]) {
      (settings as Record<string, unknown>)[field] = SET;
    }
  }

  return NextResponse.json({ ok: true, settings });
}

// POST /api/admin/payment-settings — skip "__SET__" sentinel (unchanged secrets)
export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as Partial<PaymentSettings>;

  const allowed: (keyof PaymentSettings)[] = [
    "credit_price_usd",
    "stripe_enabled", "stripe_public_key", "stripe_secret_key", "stripe_webhook_secret",
    "paypal_enabled", "paypal_client_id", "paypal_secret", "paypal_sandbox",
    "bank_transfer_enabled", "bank_transfer_info",
  ];

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    // Skip sentinel — field was not changed by the admin
    if (SECRET_FIELDS.includes(key) && body[key] === SET) continue;
    patch[key] = body[key];
  }

  if (
    patch.credit_price_usd !== undefined &&
    (typeof patch.credit_price_usd !== "number" || (patch.credit_price_usd as number) < 0)
  ) {
    return NextResponse.json({ ok: false, message: "Precio inválido." }, { status: 400 });
  }

  const admin = serviceClient();
  const { error } = await admin.rpc("set_payment_settings", { patch });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
