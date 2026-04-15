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

function paypalBase(sandbox: boolean) {
  return sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function getPayPalAccessToken(clientId: string, secret: string, sandbox: boolean): Promise<string> {
  const base = paypalBase(sandbox);
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

// POST /api/payments/paypal/create-order  { credits: number }
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const body = await request.json() as { credits?: number };
  const credits = Math.floor(body.credits ?? 0);
  if (credits < 1) return NextResponse.json({ ok: false, message: "Cantidad inválida." }, { status: 400 });

  const admin = serviceClient();
  const { data: settings } = await admin.rpc("get_payment_settings");

  if (!settings?.paypal_enabled || !settings.paypal_client_id || !settings.paypal_secret) {
    return NextResponse.json({ ok: false, message: "PayPal no está habilitado." }, { status: 503 });
  }

  const amountUsd = parseFloat((credits * settings.credit_price_usd).toFixed(2));

  // Create purchase record
  const { data: purchase, error: purchaseErr } = await admin
    .from("credit_purchases")
    .insert({
      user_id: user.id,
      user_email: user.email,
      credits,
      amount_usd: amountUsd,
      payment_method: "paypal",
      status: "pending",
    })
    .select("id")
    .single();

  if (purchaseErr || !purchase) {
    return NextResponse.json({ ok: false, message: "Error creando registro de compra." }, { status: 500 });
  }

  const sandbox = settings.paypal_sandbox ?? false;
  const accessToken = await getPayPalAccessToken(settings.paypal_client_id, settings.paypal_secret, sandbox);
  const base = paypalBase(sandbox);

  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
          description: `${credits} créditos NiloCam`,
          custom_id: purchase.id,
        },
      ],
    }),
  });

  if (!orderRes.ok) {
    await admin.from("credit_purchases").delete().eq("id", purchase.id);
    return NextResponse.json({ ok: false, message: "Error al crear orden en PayPal." }, { status: 502 });
  }

  const order = await orderRes.json() as { id?: string };
  if (!order.id) {
    await admin.from("credit_purchases").delete().eq("id", purchase.id);
    return NextResponse.json({ ok: false, message: "Respuesta inválida de PayPal." }, { status: 502 });
  }

  await admin
    .from("credit_purchases")
    .update({ payment_reference: order.id })
    .eq("id", purchase.id);

  return NextResponse.json({ ok: true, orderId: order.id, purchaseId: purchase.id, amountUsd });
}
