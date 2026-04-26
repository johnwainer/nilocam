import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import type { EmailSettings } from "@/types";

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

// POST /api/admin/email-settings/test  { to?, settings? }
// Sends a test email. Accepts optional `settings` to test unsaved credentials.
export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });

  const body = await request.json() as { to?: string; settings?: Partial<EmailSettings> };

  // Merge provided settings with DB settings (provided settings take precedence)
  let settings: EmailSettings | null = null;

  if (body.settings) {
    // Use provided settings directly (for testing before saving)
    settings = {
      provider: "disabled",
      resend_api_key: "",
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_password: "",
      smtp_secure: false,
      from_name: "Memorica",
      from_email: "noreply@example.com",
      tpl_welcome_subject: "Bienvenido a {{app_name}}, {{name}}",
      tpl_welcome_body: "",
      tpl_payment_confirmed_subject: "Pago confirmado — {{credits}} créditos",
      tpl_payment_confirmed_body: "",
      tpl_bank_approved_subject: "Transferencia aprobada — {{credits}} créditos acreditados",
      tpl_bank_approved_body: "",
      tpl_bank_rejected_subject: "Transferencia bancaria — revisión requerida",
      tpl_bank_rejected_body: "",
      tpl_credits_adjusted_subject: "Ajuste de créditos en tu cuenta",
      tpl_credits_adjusted_body: "",
      tpl_bank_transfer_received_subject: "Comprobante recibido — {{credits}} créditos en revisión",
      tpl_bank_transfer_received_body: "",
      ...body.settings,
    };
  } else {
    // Read from DB
    const admin = serviceClient();
    const { data } = await admin.rpc("get_email_settings");
    settings = data?.[0] ?? null;
  }

  if (!settings || settings.provider === "disabled") {
    return NextResponse.json({ ok: false, message: "El email está desactivado. Configura un proveedor primero." }, { status: 400 });
  }

  const to = body.to ?? user.email!;

  const result = await sendEmail(settings, to, "Email de prueba — Memorica", `
    <h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0b0b0f;">¡El email funciona!</h2>
    <p style="margin:0 0 12px;font-size:16px;color:#444;line-height:1.6;">
      Esta es una confirmación de que la configuración de email de <strong>Memorica</strong> está funcionando correctamente.
    </p>
    <p style="margin:0 0 12px;font-size:16px;color:#444;line-height:1.6;">
      Proveedor: <strong>${settings.provider === "resend" ? "Resend" : "SMTP"}</strong><br />
      Remitente: <strong>${settings.from_name} &lt;${settings.from_email}&gt;</strong><br />
      Destinatario: <strong>${to}</strong>
    </p>
    <p style="margin:0;font-size:14px;color:#888;">Enviado desde el panel de super admin de Memorica.</p>
  `);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error ?? "Error desconocido al enviar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Email de prueba enviado a ${to}` });
}
