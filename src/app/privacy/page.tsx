import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: `Cómo ${APP_NAME} recopila, usa y protege tus datos personales.`,
};

const CONTACT_EMAIL = "tech@pasosalexito.com";
const EFFECTIVE_DATE = "15 de abril de 2026";

export default function PrivacyPage() {
  return (
    <>
      <TopNav />
      <main style={s.main}>
        <div className="container" style={s.container}>
          <header style={s.header}>
            <span className="eyebrow">Legal</span>
            <h1 className="serif" style={s.h1}>Política de Privacidad</h1>
            <p className="muted" style={s.meta}>
              Vigente desde el {EFFECTIVE_DATE}
            </p>
          </header>

          <div className="divider" style={{ margin: "32px 0 48px" }} />

          <div style={s.body}>

            <Section title="1. Responsable del tratamiento">
              <p>
                {APP_NAME} es responsable del tratamiento de los datos personales que se recogen a través
                de este Servicio. Para cualquier consulta sobre privacidad, puedes contactarnos en{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>.
              </p>
            </Section>

            <Section title="2. Datos que recopilamos">
              <p>Recopilamos los siguientes tipos de datos:</p>

              <p><strong>Datos de cuenta (organizadores):</strong></p>
              <ul style={s.list}>
                <li>Correo electrónico y contraseña (almacenada cifrada).</li>
                <li>Nombre o nombre para mostrar.</li>
                <li>Historial de transacciones y créditos.</li>
              </ul>

              <p><strong>Datos de invitados (subida de fotos):</strong></p>
              <ul style={s.list}>
                <li>Nombre opcional (si el invitado decide proporcionarlo).</li>
                <li>Correo electrónico opcional.</li>
                <li>Fotos subidas al evento.</li>
                <li>Metadatos de la foto: tamaño, dimensiones, tipo MIME, datos EXIF de la cámara.</li>
                <li>Dirección IP al momento de la subida (para seguridad y moderación).</li>
              </ul>

              <p><strong>Datos técnicos (automáticos):</strong></p>
              <ul style={s.list}>
                <li>Dirección IP y tipo de navegador/dispositivo.</li>
                <li>Páginas visitadas y tiempo de sesión.</li>
                <li>Cookies de sesión necesarias para el funcionamiento del Servicio.</li>
              </ul>
            </Section>

            <Section title="3. Finalidad del tratamiento">
              <p>Usamos tus datos para:</p>
              <ul style={s.list}>
                <li>Crear y gestionar tu cuenta y los eventos que organices.</li>
                <li>Procesar pagos y gestionar tu saldo de créditos.</li>
                <li>Mostrar las fotos subidas en la galería del evento correspondiente.</li>
                <li>Moderar el contenido y garantizar la seguridad del Servicio.</li>
                <li>Enviarte comunicaciones transaccionales relacionadas con tu cuenta (confirmación de
                  compra, cambios en el servicio).</li>
                <li>Cumplir obligaciones legales.</li>
              </ul>
              <p>
                No usamos tus datos para publicidad de terceros ni los vendemos a ninguna empresa externa.
              </p>
            </Section>

            <Section title="4. Base legal del tratamiento">
              <p>
                El tratamiento de tus datos se basa en: (a) la ejecución del contrato de uso del
                Servicio; (b) tu consentimiento, cuando aplique; y (c) el interés legítimo en mantener
                la seguridad e integridad de la plataforma.
              </p>
            </Section>

            <Section title="5. Conservación de datos">
              <p>
                Los datos de cuenta se conservan mientras mantengas tu cuenta activa. Al cancelarla,
                los datos se eliminan en un plazo de 30 días, salvo obligación legal de retención.
              </p>
              <p>
                Las fotos subidas a un evento se conservan mientras el evento esté activo. El organizador
                puede eliminar fotos individuales o el evento completo en cualquier momento.
              </p>
              <p>
                Los datos de transacciones pueden conservarse hasta 7 años por razones fiscales y
                contables.
              </p>
            </Section>

            <Section title="6. Compartición de datos con terceros">
              <p>Compartimos datos únicamente con los siguientes proveedores de servicio:</p>
              <ul style={s.list}>
                <li>
                  <strong>Supabase</strong> — base de datos y almacenamiento de archivos (servidores
                  en AWS us-east-1).
                </li>
                <li>
                  <strong>Stripe</strong> — procesamiento de pagos con tarjeta. Consulta su{" "}
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={s.link}>
                    política de privacidad
                  </a>.
                </li>
                <li>
                  <strong>PayPal</strong> — procesamiento de pagos alternativos. Consulta su{" "}
                  <a href="https://www.paypal.com/privacy" target="_blank" rel="noopener noreferrer" style={s.link}>
                    política de privacidad
                  </a>.
                </li>
                <li>
                  <strong>Vercel</strong> — alojamiento y despliegue de la aplicación.
                </li>
              </ul>
              <p>
                Estos proveedores actúan como encargados del tratamiento y solo procesan datos según
                nuestras instrucciones.
              </p>
            </Section>

            <Section title="7. Fotos e imágenes de invitados">
              <p>
                Las fotos subidas a un evento son visibles para cualquier persona que acceda a la
                landing pública de ese evento (a través del enlace o QR). Si el organizador activa la
                moderación manual, las fotos permanecen privadas hasta su aprobación.
              </p>
              <p>
                Si apareces en una foto subida por otra persona y deseas que se elimine, contacta al
                organizador del evento o escríbenos a{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>.
              </p>
            </Section>

            <Section title="8. Seguridad">
              <p>
                Aplicamos medidas técnicas y organizativas para proteger tus datos: conexiones HTTPS,
                almacenamiento cifrado de contraseñas, control de acceso mediante Row Level Security
                en base de datos, y claves de acceso restringidas por entorno.
              </p>
              <p>
                Ningún sistema es 100 % infalible. Si detectas una vulnerabilidad, repórtala a{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>.
              </p>
            </Section>

            <Section title="9. Tus derechos">
              <p>Tienes derecho a:</p>
              <ul style={s.list}>
                <li><strong>Acceso:</strong> solicitar una copia de los datos que tenemos sobre ti.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos (&ldquo;derecho al olvido&rdquo;).</li>
                <li><strong>Portabilidad:</strong> recibir tus datos en formato legible por máquina.</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento en determinadas circunstancias.</li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, escríbenos a{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>.
                Responderemos en un plazo máximo de 30 días.
              </p>
            </Section>

            <Section title="10. Cookies">
              <p>
                Usamos únicamente cookies de sesión estrictamente necesarias para el funcionamiento del
                Servicio (autenticación). No usamos cookies de seguimiento, publicidad ni análisis de
                comportamiento de terceros.
              </p>
            </Section>

            <Section title="11. Menores de edad">
              <p>
                El Servicio no está dirigido a menores de 13 años. No recopilamos intencionalmente datos
                de menores. Si crees que un menor ha proporcionado datos, contáctanos y los eliminaremos
                de inmediato.
              </p>
            </Section>

            <Section title="12. Cambios a esta política">
              <p>
                Podemos actualizar esta Política de Privacidad en cualquier momento. Los cambios se
                comunicarán publicando la nueva versión en esta página con la fecha de vigencia
                actualizada. El uso continuado del Servicio tras esa fecha implica la aceptación de
                los cambios.
              </p>
            </Section>

            <Section title="13. Contacto">
              <p>
                Para ejercer tus derechos o resolver cualquier duda sobre privacidad, contáctanos en:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>
              </p>
            </Section>

          </div>

          <div className="divider" style={{ margin: "48px 0 32px" }} />

          <div style={s.footer}>
            <Link href="/terms" style={s.link}>Términos de Servicio</Link>
            <span className="muted" style={{ opacity: 0.4 }}>·</span>
            <Link href="/" style={s.link}>Volver al inicio</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={s.section}>
      <h2 style={s.h2}>{title}</h2>
      <div style={s.sectionBody}>{children}</div>
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    paddingTop: 32,
    paddingBottom: 0,
  },
  container: {
    maxWidth: 760,
  },
  header: {
    display: "grid",
    gap: 12,
  },
  h1: {
    margin: 0,
    fontSize: "clamp(36px, 5vw, 64px)",
    lineHeight: 0.96,
    letterSpacing: "-0.05em",
  },
  meta: {
    margin: 0,
    fontSize: 14,
  },
  body: {
    display: "grid",
    gap: 40,
  },
  section: {
    display: "grid",
    gap: 14,
  },
  h2: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  sectionBody: {
    display: "grid",
    gap: 12,
  },
  list: {
    margin: "4px 0",
    paddingLeft: 24,
    display: "grid",
    gap: 6,
    fontSize: 16,
    lineHeight: 1.65,
    color: "var(--text-muted)",
  },
  link: {
    color: "inherit",
    textDecoration: "underline",
    textDecorationColor: "rgba(0,0,0,0.2)",
  },
  footer: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    paddingBottom: 48,
  },
};
