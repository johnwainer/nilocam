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

  // Determine role: super_admin sees all events, owners see only theirs
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  const baseQuery = supabase
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });

  const { data: events } = isSuperAdmin
    ? await baseQuery
    : await baseQuery.eq("owner_email", user.email);

  return (
    <AdminDashboard
      userEmail={user.email}
      initialEvents={(events ?? []) as never}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
