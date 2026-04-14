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

async function getPayPalAccessToken(clientId: string, secret: string): Promise<string> {
  const base = process.env.PAYPAL_BASE_URL ?? "https://api-m.paypal.com";
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json() as { access_token: string };
  return json.access_token;
}

// POST /api/payments/paypal/capture-order  { orderId, purchaseId }
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const body = await request.json() as { orderId?: string; purchaseId?: string };
  const { orderId, purchaseId } = body;
  if (!orderId || !purchaseId) {
    return NextResponse.json({ ok: false, message: "Parámetros faltantes." }, { status: 400 });
  }

  const admin = serviceClient();

  const { data: purchase } = await admin
    .from("credit_purchases")
    .select("*")
    .eq("id", purchaseId)
    .eq("user_email", user.email)
    .single();

  if (!purchase) return NextResponse.json({ ok: false, message: "Compra no encontrada." }, { status: 404 });
  if (purchase.status === "completed") return NextResponse.json({ ok: true, alreadyDone: true });
  if (purchase.status !== "pending") {
    return NextResponse.json({ ok: false, message: "Estado de compra inválido." }, { status: 409 });
  }

  const { data: settings } = await admin
    .from("payment_settings")
    .select("paypal_client_id,paypal_secret")
    .eq("id", 1)
    .single();

  if (!settings?.paypal_client_id || !settings.paypal_secret) {
    return NextResponse.json({ ok: false, message: "PayPal no configurado." }, { status: 503 });
  }

  const accessToken = await getPayPalAccessToken(settings.paypal_client_id, settings.paypal_secret);
  const base = process.env.PAYPAL_BASE_URL ?? "https://api-m.paypal.com";

  const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const capture = await captureRes.json() as { status: string };

  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ ok: false, message: `Captura fallida (estado: ${capture.status}).` }, { status: 402 });
  }

  // Mark complete + grant credits
  await admin
    .from("credit_purchases")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", purchaseId);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, credits")
    .eq("email", user.email)
    .single();

  if (!profile) return NextResponse.json({ ok: false, message: "Perfil no encontrado." }, { status: 404 });

  const newBalance = (profile.credits ?? 0) + purchase.credits;
  await admin.from("profiles").update({ credits: newBalance }).eq("id", profile.id);

  await admin.from("credit_transactions").insert({
    user_id: profile.id,
    user_email: user.email,
    amount: purchase.credits,
    type: "purchase_paypal",
    event_id: null,
    event_slug: null,
    description: `Compra con PayPal — ${purchase.credits} créditos ($${purchase.amount_usd} USD)`,
  });

  return NextResponse.json({ ok: true, credits: newBalance, purchased: purchase.credits });
}
