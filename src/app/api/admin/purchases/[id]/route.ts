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

async function requireSuperAdmin() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return null;
  const admin = serviceClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("email", user.email).single();
  return profile?.role === "super_admin" ? user : null;
}

// PATCH /api/admin/purchases/[id]  { action: "approve" | "reject", admin_notes?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as { action: "approve" | "reject"; admin_notes?: string };
  const { action, admin_notes } = body;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ ok: false, message: "Acción inválida." }, { status: 400 });
  }

  const admin = serviceClient();

  const { data: purchase, error: fetchErr } = await admin
    .from("credit_purchases")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !purchase) {
    return NextResponse.json({ ok: false, message: "Compra no encontrada." }, { status: 404 });
  }

  if (purchase.status !== "pending") {
    return NextResponse.json({ ok: false, message: "Esta compra ya fue procesada." }, { status: 409 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const { error: updateErr } = await admin
    .from("credit_purchases")
    .update({ status: newStatus, admin_notes: admin_notes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });

  if (action === "approve") {
    // Grant credits to the user
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
        type: "purchase_bank_transfer",
        event_id: null,
        event_slug: null,
        description: `Compra por transferencia bancaria — ${purchase.credits} créditos ($${purchase.amount_usd} USD)`,
      });
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
