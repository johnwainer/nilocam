import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// GET /api/payment-settings
// Public endpoint — returns only what the client needs (no secrets).
export async function GET() {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("payment_settings")
    .select("credit_price_usd,stripe_enabled,stripe_public_key,paypal_enabled,paypal_client_id,bank_transfer_enabled,bank_transfer_info")
    .eq("id", 1)
    .single();

  if (error) {
    // Table may not exist yet — return safe defaults
    return NextResponse.json({
      ok: true,
      settings: {
        credit_price_usd: 1.0,
        stripe_enabled: false,
        stripe_public_key: "",
        paypal_enabled: false,
        paypal_client_id: "",
        bank_transfer_enabled: true,
        bank_transfer_info: {},
      },
    });
  }

  return NextResponse.json({ ok: true, settings: data });
}
