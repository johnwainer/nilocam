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

// GET /api/credits — returns balance + last 20 transactions for the logged-in user
export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const admin = serviceClient();
  const [{ data: profile }, { data: transactions }] = await Promise.all([
    admin.from("profiles").select("credits").eq("email", user.email).single(),
    admin.from("credit_transactions")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    ok: true,
    credits: profile?.credits ?? 0,
    transactions: transactions ?? [],
  });
}
