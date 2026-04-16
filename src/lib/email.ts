/**
 * Transactional email module.
 *
 * Settings (provider, credentials, templates) are read from the `email_settings`
 * table via the `get_email_settings` RPC function.
 *
 * Supported providers: Resend, SMTP (nodemailer), or disabled.
 *
 * All public functions are fire-and-forget — they never throw.
 * Call sites should `.catch(() => null)` after awaiting if desired.
 */

import { createClient } from "@supabase/supabase-js";
import { APP_NAME } from "@/lib/constants";
import type { EmailSettings } from "@/types";

// ---------------------------------------------------------------------------
// Service client (server-side only)
// ---------------------------------------------------------------------------

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ---------------------------------------------------------------------------
// Fetch settings from DB
// ---------------------------------------------------------------------------

async function fetchSettings(): Promise<EmailSettings | null> {
  try {
    const admin = serviceClient();
    const { data, error } = await admin.rpc("get_email_settings");
    if (error) {
      console.error("[email] fetchSettings RPC error:", error.message, error.code);
      return null;
    }
    if (!data?.[0]) {
      console.warn("[email] fetchSettings: no rows returned from email_settings");
      return null;
    }
    return data[0] as EmailSettings;
  } catch (err) {
    console.error("[email] fetchSettings unexpected error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

function render(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

// ---------------------------------------------------------------------------
// HTML layout wrapper
// ---------------------------------------------------------------------------

export function emailLayout(body: string, fromName = APP_NAME) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fromName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0b0b0f;padding:28px 40px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.03em;">${fromName}</span>
        </td></tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            © ${new Date().getFullYear()} ${fromName}. Todos los derechos reservados.<br />
            <a href="https://nilocam.vercel.app/privacy" style="color:#999;">Privacidad</a>
            &nbsp;·&nbsp;
            <a href="https://nilocam.vercel.app/terms" style="color:#999;">Términos</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function h1(t: string) {
  return `<h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0b0b0f;letter-spacing:-0.03em;">${t}</h2>`;
}
function para(t: string) {
  return `<p style="margin:0 0 12px;font-size:16px;color:#444;line-height:1.65;">${t}</p>`;
}
function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#0b0b0f;text-align:right;">${value}</td>
  </tr>`;
}
function infoTable(rows: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}
function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 26px;background:#0b0b0f;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Default template bodies
// Defined as {{variable}} strings so they can be displayed and edited in the
// admin panel, and rendered at send time via render().
// ---------------------------------------------------------------------------

export const DEFAULT_TEMPLATE_BODIES: Record<string, string> = {
  tpl_welcome_body:
    h1("Bienvenido a {{app_name}}, {{name}}.") +
    para("Tu cuenta está lista. Puedes empezar a crear eventos ahora mismo.") +
    infoTable(row("Créditos de bienvenida", "{{credits}} créditos") + row("Correo", "{{email}}")) +
    para("Con tus créditos de bienvenida puedes crear tu primer evento y dar acceso a la galería en vivo.") +
    btn("Ir al panel", "https://nilocam.vercel.app/admin"),

  tpl_payment_confirmed_body:
    h1("Pago confirmado.") +
    para("Tu compra de créditos ha sido procesada exitosamente.") +
    infoTable(
      row("Créditos comprados", "+{{credits}} créditos") +
      row("Monto", "${{amount}} USD") +
      row("Método de pago", "{{method}}") +
      row("Nuevo saldo", "{{balance}} créditos")
    ) +
    para("Los créditos ya están disponibles en tu cuenta.") +
    btn("Ver mi saldo", "https://nilocam.vercel.app/admin"),

  tpl_bank_approved_body:
    h1("Transferencia aprobada.") +
    para("El administrador ha revisado y aprobado tu comprobante de pago.") +
    infoTable(
      row("Créditos acreditados", "+{{credits}} créditos") +
      row("Monto", "${{amount}} USD") +
      row("Nuevo saldo", "{{balance}} créditos")
    ) +
    para("Los créditos ya están disponibles en tu cuenta. ¡Gracias por tu compra!") +
    btn("Ver mi saldo", "https://nilocam.vercel.app/admin"),

  tpl_bank_rejected_body:
    h1("Transferencia no aprobada.") +
    para("Hemos revisado tu comprobante de pago y no pudimos validarlo.") +
    infoTable(
      row("Créditos solicitados", "{{credits}} créditos") +
      row("Monto", "${{amount}} USD") +
      row("Motivo", "{{notes}}")
    ) +
    para(`Si crees que es un error, escríbenos con el comprobante y lo revisaremos.`) +
    btn("Contactar soporte", "mailto:tech@pasosalexito.com"),

  tpl_credits_adjusted_body:
    h1("Ajuste de créditos en tu cuenta.") +
    para("El administrador ha realizado un ajuste en tu saldo de créditos.") +
    infoTable(
      row("Ajuste", "{{amount}} créditos") +
      row("Nuevo saldo", "{{balance}} créditos") +
      row("Concepto", "{{description}}")
    ) +
    para("Si tienes preguntas sobre este ajuste, contáctanos.") +
    btn("Ver mi saldo", "https://nilocam.vercel.app/admin"),

  tpl_bank_transfer_received_body:
    h1("Comprobante recibido.") +
    para("Hemos recibido tu comprobante de transferencia bancaria. Lo revisaremos en breve y, una vez aprobado, acreditaremos los créditos a tu cuenta.") +
    infoTable(
      row("Créditos solicitados", "{{credits}} créditos") +
      row("Monto", "${{amount}} USD")
    ) +
    para("Te notificaremos por correo cuando tu solicitud sea procesada.") +
    btn("Ver mi cuenta", "https://nilocam.vercel.app/admin"),
};

// ---------------------------------------------------------------------------
// Core send function — accepts explicit settings (server-side callers pass them in)
// ---------------------------------------------------------------------------

export async function sendEmail(
  settings: EmailSettings,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ ok: boolean; error?: string }> {
  if (settings.provider === "disabled") {
    console.info("[email] Provider disabled — skipping email to", to);
    return { ok: false, error: "Provider disabled" };
  }

  const fromStr = settings.from_name
    ? `${settings.from_name} <${settings.from_email}>`
    : settings.from_email;

  const html = emailLayout(bodyHtml, settings.from_name || APP_NAME);

  if (settings.provider === "resend") {
    return sendViaResend(settings.resend_api_key, fromStr, to, subject, html);
  }

  if (settings.provider === "smtp") {
    return sendViaSmtp(settings, fromStr, to, subject, html);
  }

  return { ok: false, error: "Unknown provider" };
}

// ---------------------------------------------------------------------------
// Resend transport
// ---------------------------------------------------------------------------

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) return { ok: false, error: "Resend API key not configured" };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Resend unexpected error:", err);
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// SMTP transport (nodemailer)
// ---------------------------------------------------------------------------

async function sendViaSmtp(
  settings: EmailSettings,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!settings.smtp_host || !settings.smtp_user) {
    return { ok: false, error: "SMTP host or user not configured" };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password,
      },
    });
    await transporter.sendMail({ from, to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error("[email] SMTP error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Internal helper — fetches settings, resolves subject+body, sends
// ---------------------------------------------------------------------------

async function dispatch(
  subjectKey: keyof EmailSettings,
  bodyKey: keyof EmailSettings,
  to: string,
  vars: Record<string, string | number>
) {
  const settings = await fetchSettings();
  if (!settings) {
    console.warn("[email] dispatch: no settings found, skipping email to", to);
    return { ok: false };
  }
  if (settings.provider === "disabled") {
    console.info("[email] dispatch: provider is disabled, skipping email to", to);
    return { ok: false };
  }

  const allVars = { app_name: APP_NAME, ...vars };

  const rawSubject = (settings[subjectKey] as string) || "";
  const rawBody    = (settings[bodyKey]    as string) || DEFAULT_TEMPLATE_BODIES[bodyKey as string] || "";

  const subject = render(rawSubject || APP_NAME, allVars);
  const body    = render(rawBody, allVars);

  return sendEmail(settings, to, subject, body);
}

// ---------------------------------------------------------------------------
// Public typed email functions
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, displayName: string, initialCredits: number) {
  return dispatch("tpl_welcome_subject", "tpl_welcome_body", to,
    { name: displayName || to.split("@")[0], email: to, credits: initialCredits }
  ).catch(() => ({ ok: false }));
}

export async function sendPaymentConfirmedEmail(
  to: string, credits: number, amountUsd: number, method: "Stripe" | "PayPal", newBalance: number
) {
  return dispatch("tpl_payment_confirmed_subject", "tpl_payment_confirmed_body", to,
    { email: to, credits, amount: amountUsd, method, balance: newBalance }
  ).catch(() => ({ ok: false }));
}

export async function sendBankTransferApprovedEmail(
  to: string, credits: number, amountUsd: number, newBalance: number
) {
  return dispatch("tpl_bank_approved_subject", "tpl_bank_approved_body", to,
    { email: to, credits, amount: amountUsd, balance: newBalance }
  ).catch(() => ({ ok: false }));
}

export async function sendBankTransferRejectedEmail(
  to: string, credits: number, amountUsd: number, adminNotes?: string | null
) {
  return dispatch("tpl_bank_rejected_subject", "tpl_bank_rejected_body", to,
    { email: to, credits, amount: amountUsd, notes: adminNotes ?? "" }
  ).catch(() => ({ ok: false }));
}

export async function sendCreditsAdjustedEmail(
  to: string, amount: number, newBalance: number, description: string
) {
  const sign = amount >= 0 ? `+${amount}` : String(amount);
  return dispatch("tpl_credits_adjusted_subject", "tpl_credits_adjusted_body", to,
    { email: to, amount: sign, balance: newBalance, description: description || "Ajuste de créditos" }
  ).catch(() => ({ ok: false }));
}

export async function sendBankTransferReceivedEmail(
  to: string, credits: number, amountUsd: number
) {
  return dispatch("tpl_bank_transfer_received_subject", "tpl_bank_transfer_received_body", to,
    { email: to, credits, amount: amountUsd }
  ).catch(() => ({ ok: false }));
}
