import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sendPaymentConfirmedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// POST /api/payments/stripe/webhook
// Stripe calls this after payment events.
// Webhook secret is configured from the super admin panel (Pagos tab).
// This is a backup — the /confirm route is the primary grant path.
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const admin = serviceClient();
  const { data: settings } = await admin.rpc("get_payment_settings");

  if (!settings?.stripe_secret_key) {
    return NextResponse.json({ ok: false, message: "Stripe no configurado." }, { status: 503 });
  }

  if (!settings.stripe_webhook_secret) {
    return NextResponse.json({ ok: false, message: "Webhook secret no configurado en el panel de pagos." }, { status: 503 });
  }

  const stripe = new Stripe(settings.stripe_secret_key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, settings.stripe_webhook_secret);
  } catch {
    return NextResponse.json({ ok: false, message: "Firma inválida." }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const purchaseId = intent.metadata?.purchase_id;
    if (!purchaseId) return NextResponse.json({ ok: true });

    const { data: purchase } = await admin
      .from("credit_purchases")
      .select("*")
      .eq("id", purchaseId)
      .single();

    if (!purchase || purchase.status === "completed") return NextResponse.json({ ok: true });

    await admin
      .from("credit_purchases")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", purchaseId);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, credits")
      .eq("email", purchase.user_email)
      .single();

    if (profile) {
      const newBalance = (profile.credits ?? 0) + purchase.credits;
      await admin.from("profiles").update({ credits: newBalance }).eq("id", profile.id);
      await admin.from("credit_transactions").insert({
        user_id: profile.id,
        user_email: purchase.user_email,
        amount: purchase.credits,
        type: "purchase_stripe",
        event_id: null,
        event_slug: null,
        description: `Compra con tarjeta — ${purchase.credits} créditos ($${purchase.amount_usd} USD)`,
      });

      sendPaymentConfirmedEmail(purchase.user_email, purchase.credits, purchase.amount_usd, "Stripe", newBalance).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}
