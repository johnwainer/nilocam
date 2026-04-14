import Stripe from "stripe";
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

// POST /api/payments/stripe/create-intent  { credits: number }
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const body = await request.json() as { credits?: number };
  const credits = Math.floor(body.credits ?? 0);
  if (credits < 1) return NextResponse.json({ ok: false, message: "Cantidad inválida." }, { status: 400 });

  const admin = serviceClient();
  const { data: settings } = await admin
    .from("payment_settings")
    .select("stripe_enabled,stripe_secret_key,credit_price_usd")
    .eq("id", 1)
    .single();

  if (!settings?.stripe_enabled || !settings.stripe_secret_key) {
    return NextResponse.json({ ok: false, message: "Stripe no está habilitado." }, { status: 503 });
  }

  const amountUsd = parseFloat((credits * settings.credit_price_usd).toFixed(2));
  const amountCents = Math.round(amountUsd * 100);

  if (amountCents < 50) {
    return NextResponse.json({ ok: false, message: "Monto mínimo: $0.50 USD." }, { status: 400 });
  }

  const stripe = new Stripe(settings.stripe_secret_key);

  // Create a purchase record first (idempotent reference)
  const { data: purchase, error: purchaseErr } = await admin
    .from("credit_purchases")
    .insert({
      user_id: user.id,
      user_email: user.email,
      credits,
      amount_usd: amountUsd,
      payment_method: "stripe",
      status: "pending",
    })
    .select("id")
    .single();

  if (purchaseErr || !purchase) {
    return NextResponse.json({ ok: false, message: "Error creando registro de compra." }, { status: 500 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata: {
      purchase_id: purchase.id,
      user_email: user.email,
      credits: String(credits),
    },
  });

  // Save Stripe PI reference
  await admin
    .from("credit_purchases")
    .update({ payment_reference: paymentIntent.id })
    .eq("id", purchase.id);

  return NextResponse.json({
    ok: true,
    clientSecret: paymentIntent.client_secret,
    purchaseId: purchase.id,
    amountUsd,
  });
}
