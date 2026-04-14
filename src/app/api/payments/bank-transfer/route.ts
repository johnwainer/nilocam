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

// POST /api/payments/bank-transfer  { credits, proofUrl }
// Creates a pending purchase; admin must approve to grant credits.
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });

  const body = await request.json() as { credits?: number; proofUrl?: string };
  const credits = Math.floor(body.credits ?? 0);
  const proofUrl = body.proofUrl?.trim();

  if (credits < 1) return NextResponse.json({ ok: false, message: "Cantidad inválida." }, { status: 400 });
  if (!proofUrl) return NextResponse.json({ ok: false, message: "El comprobante es requerido." }, { status: 400 });

  const admin = serviceClient();
  const { data: settings } = await admin.rpc("get_payment_settings");

  if (!settings?.bank_transfer_enabled) {
    return NextResponse.json({ ok: false, message: "Transferencia bancaria no está habilitada." }, { status: 503 });
  }

  const amountUsd = parseFloat((credits * settings.credit_price_usd).toFixed(2));

  const { error } = await admin.from("credit_purchases").insert({
    user_id: user.id,
    user_email: user.email,
    credits,
    amount_usd: amountUsd,
    payment_method: "bank_transfer",
    status: "pending",
    proof_url: proofUrl,
  });

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: "Comprobante enviado. Tu solicitud será revisada en breve." });
}
