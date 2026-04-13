import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RequestBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() ?? "";

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Debes enviar un email válido y una contraseña de al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, message: "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let existingUser: { id: string } | null = null;
  for (let page = 1; page <= 10 && !existingUser; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    existingUser = data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
    if (data.users.length < 200) break;
  }

  const metadata = {
    full_name: displayName || email.split("@")[0] || "",
  };

  let userId = existingUser?.id ?? null;

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (updateError) {
      return NextResponse.json({ ok: false, message: updateError.message }, { status: 400 });
    }
  } else {
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createError || !createdUser.user) {
      return NextResponse.json(
        { ok: false, message: createError?.message ?? "No pudimos crear el acceso." },
        { status: 400 }
      );
    }

    userId = createdUser.user.id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("email", email)
    .maybeSingle();

  if (!userId) {
    return NextResponse.json({ ok: false, message: "No pudimos resolver el usuario creado." }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    display_name: displayName || profile?.display_name || metadata.full_name,
    role: profile?.role ?? "owner",
  });

  if (profileError) {
    return NextResponse.json({ ok: false, message: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Acceso listo." });
}
