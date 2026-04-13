import { AdminDashboard } from "@/components/admin-dashboard";
import { fetchStoreFromSupabase } from "@/lib/supabase/data";

export default async function AdminPage() {
  const store = await fetchStoreFromSupabase();
  return <AdminDashboard initialStore={store} />;
}
