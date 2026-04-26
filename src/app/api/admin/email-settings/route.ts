import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailSettings } from "@/types";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/email";

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
  const { data: profile } = await admin.from("profiles").select("role").eq("email", user.email).single();
  return profile?.role === "super_admin" ? user : null;
}

// GET /api/admin/email-settings
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const admin = serviceClient();
  const { data, error } = await admin.rpc("get_email_settings");

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const settings = data?.[0] ?? null;

  // Fill empty body fields with default template content so the admin
  // sees actual content in the editor instead of a blank textarea.
  if (settings) {
    for (const key of Object.keys(DEFAULT_TEMPLATE_BODIES) as (keyof EmailSettings)[]) {
      if (!settings[key]) {
        (settings as Record<string, unknown>)[key as string] = DEFAULT_TEMPLATE_BODIES[key as string];
      }
    }
  }

  return NextResponse.json({ ok: true, settings });
}

// POST /api/admin/email-settings
export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as Partial<EmailSettings>;

  const admin = serviceClient();
  const { error } = await admin.rpc("set_email_settings", {
    p_provider:                       body.provider                       ?? "disabled",
    p_resend_api_key:                 body.resend_api_key                 ?? "",
    p_smtp_host:                      body.smtp_host                      ?? "",
    p_smtp_port:                      body.smtp_port                      ?? 587,
    p_smtp_user:                      body.smtp_user                      ?? "",
    p_smtp_password:                  body.smtp_password                  ?? "",
    p_smtp_secure:                    body.smtp_secure                    ?? false,
    p_from_name:                      body.from_name                      ?? "Memorica",
    p_from_email:                     body.from_email                     ?? "noreply@example.com",
    p_tpl_welcome_subject:            body.tpl_welcome_subject            ?? "Bienvenido a {{app_name}}, {{name}}",
    p_tpl_welcome_body:               body.tpl_welcome_body               ?? "",
    p_tpl_payment_confirmed_subject:  body.tpl_payment_confirmed_subject  ?? "Pago confirmado — {{credits}} créditos",
    p_tpl_payment_confirmed_body:     body.tpl_payment_confirmed_body     ?? "",
    p_tpl_bank_approved_subject:      body.tpl_bank_approved_subject      ?? "Transferencia aprobada — {{credits}} créditos acreditados",
    p_tpl_bank_approved_body:         body.tpl_bank_approved_body         ?? "",
    p_tpl_bank_rejected_subject:                body.tpl_bank_rejected_subject                ?? "Transferencia bancaria — revisión requerida",
    p_tpl_bank_rejected_body:                   body.tpl_bank_rejected_body                   ?? "",
    p_tpl_credits_adjusted_subject:             body.tpl_credits_adjusted_subject             ?? "Ajuste de créditos en tu cuenta",
    p_tpl_credits_adjusted_body:                body.tpl_credits_adjusted_body                ?? "",
    p_tpl_bank_transfer_received_subject:       body.tpl_bank_transfer_received_subject       ?? "Comprobante recibido — {{credits}} créditos en revisión",
    p_tpl_bank_transfer_received_body:          body.tpl_bank_transfer_received_body          ?? "",
  });

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
