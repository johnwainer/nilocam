import { Suspense } from "react";
import { AdminLogin } from "@/components/admin-login";

export default function AuthPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
