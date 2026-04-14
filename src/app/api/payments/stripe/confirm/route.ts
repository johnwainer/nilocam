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

// POST /api/payments/stripe/confirm  { purchaseId, paymentIntentId }
// Called by client after Stripe payment succeeds. Verifies with Stripe and grants credits.
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const body = await request.json() as { purchaseId?: string; paymentIntentId?: string };
  const { purchaseId, paymentIntentId } = body;

  if (!purchaseId || !paymentIntentId) {
    return NextResponse.json({ ok: false, message: "Parámetros faltantes." }, { status: 400 });
  }

  const admin = serviceClient();

  // Fetch purchase and verify ownership
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

  const { data: settings } = await admin.rpc("get_payment_settings");

  if (!settings?.stripe_secret_key) {
    return NextResponse.json({ ok: false, message: "Stripe no configurado." }, { status: 503 });
  }

  const stripe = new Stripe(settings.stripe_secret_key);
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status !== "succeeded") {
    return NextResponse.json({ ok: false, message: `Pago no completado (estado: ${intent.status}).` }, { status: 402 });
  }

  // Verify the PI matches this purchase
  if (intent.metadata?.purchase_id !== purchaseId) {
    return NextResponse.json({ ok: false, message: "Referencia de pago inválida." }, { status: 400 });
  }

  // Mark purchase complete
  await admin
    .from("credit_purchases")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", purchaseId);

  // Grant credits
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
    type: "purchase_stripe",
    event_id: null,
    event_slug: null,
    description: `Compra con tarjeta — ${purchase.credits} créditos ($${purchase.amount_usd} USD)`,
  });

  return NextResponse.json({ ok: true, credits: newBalance, purchased: purchase.credits });
}
