/**
 * Pure HTML layout wrapper for email previews.
 * No server-only imports — safe to use in client components.
 */
export function emailLayout(body: string, fromName = "Nilo Cam") {
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
