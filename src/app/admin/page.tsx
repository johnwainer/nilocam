import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user?.email) {
    return <AdminLogin />;
  }

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });

  return <AdminDashboard userEmail={user.email} initialEvents={(events ?? []) as never} />;
}
