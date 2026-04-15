import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description: `Términos y condiciones de uso de ${APP_NAME}.`,
};

const CONTACT_EMAIL = "tech@pasosalexito.com";
const EFFECTIVE_DATE = "15 de abril de 2026";

export default function TermsPage() {
  return (
    <>
      <TopNav />
      <main style={s.main}>
        <div className="container" style={s.container}>
          <header style={s.header}>
            <span className="eyebrow">Legal</span>
            <h1 className="serif" style={s.h1}>Términos de Servicio</h1>
            <p className="muted" style={s.meta}>
              Vigentes desde el {EFFECTIVE_DATE}
            </p>
          </header>

          <div className="divider" style={{ margin: "32px 0 48px" }} />

          <div style={s.body}>

            <Section title="1. Aceptación de los términos">
              <p>
                Al acceder o utilizar {APP_NAME} (en adelante "el Servicio"), aceptas estos Términos de
                Servicio en su totalidad. Si no estás de acuerdo con alguna parte de estos términos,
                no debes usar el Servicio.
              </p>
            </Section>

            <Section title="2. Descripción del Servicio">
              <p>
                {APP_NAME} es una plataforma web (PWA) que permite a los organizadores de eventos crear
                landings personalizadas con código QR, a través de las cuales los invitados pueden subir
                y ver fotos en tiempo real sin necesidad de instalar ninguna aplicación.
              </p>
              <p>
                El Servicio incluye herramientas de gestión de eventos, galería de fotos, moderación de
                contenido y un sistema de créditos para acceder a funciones premium.
              </p>
            </Section>

            <Section title="3. Registro y cuentas">
              <p>
                Para crear eventos necesitas registrarte con un correo electrónico y contraseña válidos.
                Eres responsable de mantener la confidencialidad de tus credenciales y de todas las
                actividades que ocurran bajo tu cuenta.
              </p>
              <p>
                Te comprometes a proporcionar información veraz y actualizada. Nos reservamos el derecho
                de suspender cuentas que incumplan estos términos.
              </p>
            </Section>

            <Section title="4. Sistema de créditos y pagos">
              <p>
                El Servicio opera con un sistema de créditos. Los créditos se usan para crear eventos y
                ampliar la capacidad de fotos por evento. Al registrarte recibes créditos de bienvenida.
              </p>
              <p>
                Los créditos adicionales pueden adquirirse mediante Stripe (tarjeta), PayPal o
                transferencia bancaria. Los precios se expresan en dólares estadounidenses (USD) y
                pueden cambiar con previo aviso.
              </p>
              <p>
                <strong>Política de reembolsos:</strong> Los créditos comprados no son reembolsables
                salvo error técnico comprobable atribuible al Servicio. Para solicitar un reembolso
                escríbenos a{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>{" "}
                dentro de los 7 días siguientes a la compra.
              </p>
            </Section>

            <Section title="5. Contenido del usuario">
              <p>
                Al subir fotos u otro contenido a través del Servicio, conservas todos los derechos
                sobre dicho contenido. Nos otorgas una licencia no exclusiva, libre de regalías y
                mundial para almacenar, mostrar y distribuir ese contenido únicamente en el contexto
                del evento correspondiente.
              </p>
              <p>
                Está prohibido subir contenido que:
              </p>
              <ul style={s.list}>
                <li>Sea obsceno, violento, difamatorio o ilegal.</li>
                <li>Viole derechos de autor, privacidad o imagen de terceros.</li>
                <li>Contenga malware, spam o código malicioso.</li>
                <li>Involucre menores de edad de forma inapropiada.</li>
              </ul>
              <p>
                Podemos eliminar cualquier contenido que infrinja estas normas sin previo aviso.
              </p>
            </Section>

            <Section title="6. Conducta del usuario">
              <p>Te comprometes a no:</p>
              <ul style={s.list}>
                <li>Usar el Servicio para fines ilegales o no autorizados.</li>
                <li>Intentar acceder sin autorización a sistemas o cuentas ajenas.</li>
                <li>Usar herramientas automatizadas (bots, scrapers) sin permiso escrito.</li>
                <li>Interferir con el funcionamiento normal del Servicio.</li>
                <li>Crear múltiples cuentas para evadir restricciones.</li>
              </ul>
            </Section>

            <Section title="7. Disponibilidad del Servicio">
              <p>
                Nos esforzamos por mantener el Servicio disponible de forma continua, pero no garantizamos
                una disponibilidad del 100 %. Podemos realizar mantenimientos programados con o sin aviso
                previo. No somos responsables de pérdidas causadas por interrupciones del Servicio.
              </p>
            </Section>

            <Section title="8. Limitación de responsabilidad">
              <p>
                En la máxima medida permitida por la ley, {APP_NAME} y sus operadores no serán
                responsables de daños indirectos, incidentales, especiales o consecuentes derivados del
                uso o la imposibilidad de usar el Servicio.
              </p>
              <p>
                La responsabilidad total acumulada frente a cualquier usuario no excederá el importe
                pagado por ese usuario durante los 3 meses anteriores al hecho que originó la reclamación.
              </p>
            </Section>

            <Section title="9. Propiedad intelectual">
              <p>
                La plataforma, su código, diseño, logotipos y textos son propiedad de {APP_NAME} y están
                protegidos por las leyes de propiedad intelectual aplicables. No puedes copiar, modificar
                ni distribuir ninguno de estos elementos sin autorización escrita.
              </p>
            </Section>

            <Section title="10. Terminación">
              <p>
                Puedes cancelar tu cuenta en cualquier momento escribiéndonos a{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>.
                Nos reservamos el derecho de suspender o terminar tu acceso si incumples estos términos,
                sin responsabilidad hacia ti.
              </p>
              <p>
                Al terminar tu cuenta, los datos asociados podrán eliminarse pasados 30 días, salvo
                obligación legal de retención.
              </p>
            </Section>

            <Section title="11. Modificaciones">
              <p>
                Podemos actualizar estos términos en cualquier momento. Los cambios se comunicarán
                publicando la nueva versión en esta página con la fecha de vigencia actualizada. El uso
                continuado del Servicio tras esa fecha implica la aceptación de los cambios.
              </p>
            </Section>

            <Section title="12. Ley aplicable">
              <p>
                Estos términos se rigen por las leyes aplicables en el territorio de operación del
                Servicio. Cualquier disputa se resolverá preferentemente mediante negociación directa;
                de no ser posible, ante los tribunales competentes.
              </p>
            </Section>

            <Section title="13. Contacto">
              <p>
                Para cualquier pregunta sobre estos Términos de Servicio, escríbenos a:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={s.link}>{CONTACT_EMAIL}</a>
              </p>
            </Section>

          </div>

          <div className="divider" style={{ margin: "48px 0 32px" }} />

          <div style={s.footer}>
            <Link href="/privacy" style={s.link}>Política de Privacidad</Link>
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
