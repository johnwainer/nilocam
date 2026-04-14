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

async function requireSuperAdmin() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) return null;
  const admin = serviceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .single();
  return profile?.role === "super_admin" ? user : null;
}

// GET /api/admin/users — list all users with ban status
export async function GET() {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const admin = serviceClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, display_name, role, credits, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Fetch ban status from auth.users via admin API
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const banMap = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.banned_until ?? null])
  );

  const users = (profiles ?? []).map((p: { id: string }) => ({
    ...p,
    banned_until: banMap.get(p.id) ?? null,
    is_active: !banMap.get(p.id),
  }));

  return NextResponse.json({ ok: true, users });
}

// POST /api/admin/users — invite / create a user
export async function POST(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as { email?: string; display_name?: string; role?: string };
  const { email, display_name, role = "owner" } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Email inválido." }, { status: 400 });
  }
  if (!["owner", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ ok: false, message: "Rol inválido." }, { status: 400 });
  }

  const admin = serviceClient();

  // Generate an invite link without auto-sending email, so we can return it
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: display_name ?? email } },
  });
  if (linkErr) {
    return NextResponse.json({ ok: false, message: linkErr.message }, { status: 500 });
  }

  const userId = linkData.user.id;
  const magicLink = linkData.properties?.action_link ?? null;

  // Upsert profile with desired role and display_name
  await admin.from("profiles").upsert({
    id: userId,
    email,
    display_name: display_name ?? email,
    role,
  }, { onConflict: "id" });

  return NextResponse.json({ ok: true, id: userId, magic_link: magicLink });
}

// PATCH /api/admin/users — update role, display_name, or ban status
export async function PATCH(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as {
    id?: string;
    role?: string;
    display_name?: string;
    is_active?: boolean;
  };
  const { id, role, display_name, is_active } = body;

  if (!id) return NextResponse.json({ ok: false, message: "Falta id." }, { status: 400 });

  const admin = serviceClient();

  // Update profile fields
  const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role) {
    if (!["owner", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ ok: false, message: "Rol inválido." }, { status: 400 });
    }
    profileUpdate.role = role;
  }
  if (display_name !== undefined) profileUpdate.display_name = display_name;

  if (Object.keys(profileUpdate).length > 1) {
    const { error } = await admin.from("profiles").update(profileUpdate).eq("id", id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Ban / unban via auth admin
  if (is_active !== undefined) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: is_active ? "none" : "87600h",
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users?id=xxx — permanently delete a user
export async function DELETE(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, message: "Falta id." }, { status: 400 });

  const admin = serviceClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
