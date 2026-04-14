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
  const authMap = new Map(
    (authList?.users ?? []).map((u) => [u.id, u])
  );

  const users = (profiles ?? []).map((p: { id: string }) => {
    const au = authMap.get(p.id);
    return {
      ...p,
      banned_until: au?.banned_until ?? null,
      is_active: !au?.banned_until,
      last_sign_in_at: au?.last_sign_in_at ?? null,
      confirmed_at: au?.confirmed_at ?? null,
    };
  });

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

  // Create user (no password — they will set it via the app's registration form)
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: display_name ?? email },
  });
  if (createErr) {
    return NextResponse.json({ ok: false, message: createErr.message }, { status: 500 });
  }

  const userId = createdUser.user.id;

  // Upsert profile with desired role and display_name
  await admin.from("profiles").upsert({
    id: userId,
    email,
    display_name: display_name ?? email,
    role,
  }, { onConflict: "id" });

  // Build invite URL pointing at the app's own registration page
  const { origin } = new URL(request.url);
  const params = new URLSearchParams({ email });
  if (display_name) params.set("name", display_name);
  const inviteLink = `${origin}/auth?${params.toString()}`;

  return NextResponse.json({ ok: true, id: userId, magic_link: inviteLink });
}

// PATCH /api/admin/users — update role, display_name, or ban status
export async function PATCH(request: Request) {
  const caller = await requireSuperAdmin();
  if (!caller) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as {
    id?: string;
    email?: string;
    action?: string;
    role?: string;
    display_name?: string;
    is_active?: boolean;
    new_password?: string;
  };
  const { id, email, action, role, display_name, is_active, new_password } = body;

  // Regenerate invite link for an existing user using the app's own registration page
  if (action === "regenerate_link") {
    if (!email) return NextResponse.json({ ok: false, message: "Falta email." }, { status: 400 });
    const admin = serviceClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("email", email)
      .single();
    const { origin } = new URL(request.url);
    const params = new URLSearchParams({ email });
    if (profile?.display_name) params.set("name", profile.display_name);
    const inviteLink = `${origin}/auth?${params.toString()}`;
    return NextResponse.json({ ok: true, magic_link: inviteLink });
  }

  // Reset user password
  if (action === "reset_password") {
    if (!id) return NextResponse.json({ ok: false, message: "Falta id." }, { status: 400 });
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ ok: false, message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    const admin = serviceClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password: new_password });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

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
