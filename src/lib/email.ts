import { Resend } from "resend";
import { APP_NAME } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;

// ---------------------------------------------------------------------------
// Send helper — never throws; returns { ok, error }
// ---------------------------------------------------------------------------

async function send(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    // No API key configured — skip silently
    console.warn("[email] RESEND_API_KEY not set, skipping email to", to);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function layout(body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#0b0b0f;padding:28px 40px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.03em;">${APP_NAME}</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.<br />
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

function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#0b0b0f;letter-spacing:-0.04em;line-height:1.1;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 14px;font-size:16px;color:#444;line-height:1.65;">${text}</p>`;
}

function badge(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#0b0b0f;text-align:right;">${value}</td>
  </tr>`;
}

function table(rows: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">${rows}</table>`;
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#0b0b0f;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------

/** Sent to new users after their account is created via bootstrap. */
export async function sendWelcomeEmail(to: string, displayName: string, initialCredits: number) {
  const name = displayName || to.split("@")[0];
  const html = layout(`
    ${h1(`Bienvenido a ${APP_NAME}, ${name}.`)}
    ${p("Tu cuenta está lista. Puedes empezar a crear eventos ahora mismo.")}
    ${table(
      badge("Créditos de bienvenida", `${initialCredits} créditos`) +
      badge("Correo", to)
    )}
    ${p("Con tus créditos de bienvenida puedes crear tu primer evento y dar a los invitados acceso a la galería en vivo.")}
    ${btn("Ir al panel", "https://nilocam.vercel.app/admin")}
  `);
  return send(to, `Bienvenido a ${APP_NAME}`, html);
}

/** Sent when a Stripe or PayPal payment is confirmed. */
export async function sendPaymentConfirmedEmail(
  to: string,
  credits: number,
  amountUsd: number,
  method: "Stripe" | "PayPal",
  newBalance: number
) {
  const html = layout(`
    ${h1("Pago confirmado.")}
    ${p("Tu compra de créditos ha sido procesada exitosamente.")}
    ${table(
      badge("Créditos comprados", `+${credits} créditos`) +
      badge("Monto", `$${amountUsd.toFixed(2)} USD`) +
      badge("Método de pago", method) +
      badge("Nuevo saldo", `${newBalance} créditos`)
    )}
    ${p("Los créditos ya están disponibles en tu cuenta.")}
    ${btn("Ver mi saldo", "https://nilocam.vercel.app/admin")}
  `);
  return send(to, `Compra confirmada — ${credits} créditos`, html);
}

/** Sent when the admin approves a bank transfer purchase. */
export async function sendBankTransferApprovedEmail(
  to: string,
  credits: number,
  amountUsd: number,
  newBalance: number
) {
  const html = layout(`
    ${h1("Transferencia aprobada.")}
    ${p("El administrador ha revisado y aprobado tu comprobante de pago.")}
    ${table(
      badge("Créditos acreditados", `+${credits} créditos`) +
      badge("Monto", `$${amountUsd.toFixed(2)} USD`) +
      badge("Nuevo saldo", `${newBalance} créditos`)
    )}
    ${p("Los créditos ya están disponibles en tu cuenta. ¡Gracias por tu compra!")}
    ${btn("Ver mi saldo", "https://nilocam.vercel.app/admin")}
  `);
  return send(to, `Transferencia aprobada — ${credits} créditos acreditados`, html);
}

/** Sent when the admin rejects a bank transfer purchase. */
export async function sendBankTransferRejectedEmail(
  to: string,
  credits: number,
  amountUsd: number,
  adminNotes?: string | null
) {
  const notesRow = adminNotes
    ? badge("Motivo", adminNotes)
    : "";
  const html = layout(`
    ${h1("Transferencia no aprobada.")}
    ${p("Hemos revisado tu comprobante de pago y no pudimos validarlo.")}
    ${table(
      badge("Créditos solicitados", `${credits} créditos`) +
      badge("Monto", `$${amountUsd.toFixed(2)} USD`) +
      notesRow
    )}
    ${p(`Si crees que es un error, escríbenos a <a href="mailto:tech@pasosalexito.com" style="color:#0b0b0f;">tech@pasosalexito.com</a> con el comprobante y lo revisaremos.`)}
    ${btn("Contactar soporte", "mailto:tech@pasosalexito.com")}
  `);
  return send(to, "Transferencia bancaria — revisión requerida", html);
}
