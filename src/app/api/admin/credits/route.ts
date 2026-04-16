import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendCreditsAdjustedEmail } from "@/lib/email";

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
  const { data: p } = await admin.from("profiles").select("role").eq("email", user.email).single();
  return p?.role === "super_admin" ? user : null;
}

// PATCH /api/admin/credits  { user_id, user_email, amount, description }
// Manually grant or deduct credits for any user
export async function PATCH(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as {
    scope?: "single" | "all";
    user_id?: string;   // UUID or email — we look up by whichever is provided
    user_email?: string;
    amount?: number;
    description?: string;
  };

  const { scope = "single", user_id, user_email, amount, description = "" } = body;
  if (amount === undefined) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  const admin = serviceClient();

  if (scope === "all") {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, email, credits")
      .order("email", { ascending: true });

    if (profilesError) {
      return NextResponse.json({ ok: false, message: profilesError.message }, { status: 500 });
    }

    const updated: Array<{ id: string; email: string; credits: number }> = [];
    for (const profile of profiles ?? []) {
      const newBalance = Math.max(0, (profile.credits ?? 0) + amount);
      const { error: updateError } = await admin.from("profiles").update({ credits: newBalance }).eq("id", profile.id);
      if (updateError) {
        return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
      }

      const { error: txError } = await admin.from("credit_transactions").insert({
        user_id: profile.id,
        user_email: profile.email,
        amount,
        type: amount >= 0 ? "manual_grant" : "manual_deduct",
        description: description || (amount >= 0 ? "Créditos globales otorgados por super admin" : "Créditos globales descontados por super admin"),
      });
      if (txError) {
        return NextResponse.json({ ok: false, message: txError.message }, { status: 500 });
      }

      updated.push({ id: profile.id, email: profile.email, credits: newBalance });
    }

    return NextResponse.json({
      ok: true,
      scope: "all",
      updated,
    });
  }

  if ((!user_id && !user_email)) {
    return NextResponse.json({ ok: false, message: "Faltan parámetros." }, { status: 400 });
  }

  // Resolve profile by UUID or by email
  const isUUID = user_id && /^[0-9a-f-]{36}$/.test(user_id);
  const profileQuery = isUUID
    ? admin.from("profiles").select("id, email, credits").eq("id", user_id).single()
    : admin.from("profiles").select("id, email, credits").eq("email", user_email ?? user_id ?? "").single();

  const { data: profile } = await profileQuery;
  if (!profile) return NextResponse.json({ ok: false, message: "Usuario no encontrado." }, { status: 404 });

  const resolvedEmail = user_email ?? profile.email;

  const newBalance = Math.max(0, (profile.credits ?? 0) + amount);
  await admin.from("profiles").update({ credits: newBalance }).eq("id", profile.id);

  await admin.from("credit_transactions").insert({
    user_id: profile.id,
    user_email: resolvedEmail,
    amount,
    type: amount >= 0 ? "manual_grant" : "manual_deduct",
    description: description || (amount >= 0 ? "Créditos otorgados por admin" : "Créditos descontados por admin"),
  });

  sendCreditsAdjustedEmail(resolvedEmail, amount, newBalance, description).catch(() => null);

  return NextResponse.json({ ok: true, credits: newBalance, scope: "single" });
}
