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

// GET /api/credits
//   ?all=1  (super admin only) — returns ALL users' transactions
//   ?user=email — (super admin only) — filter by user
export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const wantsAll = searchParams.get("all") === "1";
  const filterUser = searchParams.get("user");

  const admin = serviceClient();

  // Check role
  const { data: profile } = await admin
    .from("profiles")
    .select("credits, role")
    .eq("email", user.email)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  if ((wantsAll || filterUser) && !isSuperAdmin) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  if (wantsAll || filterUser) {
    // Super admin global view
    let query = admin
      .from("credit_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterUser) query = query.eq("user_email", filterUser);

    const { data: transactions } = await query;

    // Also get all user balances for the global view
    const { data: profiles } = await admin
      .from("profiles")
      .select("email, credits, display_name")
      .order("email");

    return NextResponse.json({
      ok: true,
      transactions: transactions ?? [],
      profiles: profiles ?? [],
    });
  }

  // Own transactions
  const { data: transactions } = await admin
    .from("credit_transactions")
    .select("*")
    .eq("user_email", user.email)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({
    ok: true,
    credits: profile?.credits ?? 0,
    transactions: transactions ?? [],
  });
}
