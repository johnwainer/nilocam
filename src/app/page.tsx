import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";

// ─── Data ────────────────────────────────────────────────────────────────────

const howItWorks = [
  {
    step: "1",
    title: "Crea tu evento en minutos",
    text: "Elige el nombre, el estilo visual, el tipo de evento y cómo quieres moderar las fotos. No necesitas saber de tecnología.",
  },
  {
    step: "2",
    title: "Comparte el QR con tus invitados",
    text: "Imprímelo, proyéctalo o mándalo por WhatsApp. Al abrirlo, el invitado está dentro al instante: sin apps, sin cuentas, sin pasos extra.",
  },
  {
    step: "3",
    title: "Las fotos aparecen en vivo",
    text: "Cada captura llega a la galería del evento en tiempo real. Todos los presentes la ven al mismo tiempo en la pantalla grande.",
  },
];

const features = [
  {
    icon: "📸",
    title: "Galería en tiempo real",
    desc: "Las fotos aparecen en pantalla en segundos, sin recargar. El momento se ve mientras sucede.",
  },
  {
    icon: "🔗",
    title: "QR instantáneo",
    desc: "Cada evento genera su propio código QR. Imprímelo, proyéctalo o compártelo por mensaje.",
  },
  {
    icon: "🎨",
    title: "Landing personalizable",
    desc: "Más de 20 temas visuales, colores y textos editables. Tu evento, tu identidad.",
  },
  {
    icon: "🛡",
    title: "Moderación de fotos",
    desc: "Aprueba manualmente o activa el modo automático. Tú decides qué aparece en pantalla.",
  },
  {
    icon: "📺",
    title: "Pantalla de proyección",
    desc: "Slideshow en pantalla grande con efecto Ken Burns. Ideal para proyectar en el salón.",
  },
  {
    icon: "📱",
    title: "Sin app. Sin cuenta.",
    desc: "El invitado abre el QR desde cualquier teléfono y sube la foto. Nada que instalar.",
  },
  {
    icon: "🎞",
    title: "Filtros y marcos",
    desc: "15 filtros de cámara y 8 marcos fotográficos. Fotos con estilo desde el primer clic.",
  },
  {
    icon: "⚡",
    title: "Listo en 3 minutos",
    desc: "Desde que creas la cuenta hasta tener un evento activo. Sin configuraciones complicadas.",
  },
];

const faqs = [
  {
    q: "¿Los invitados tienen que instalar algo?",
    a: "No. Abren el QR desde el navegador de su teléfono (iPhone o Android) y listo. No necesitan cuenta, no bajan ninguna app.",
  },
  {
    q: "¿Cómo funcionan los créditos?",
    a: "Al registrarte recibes créditos de bienvenida para empezar. Cada operación (crear un evento, subir fotos) consume créditos. Cuando los necesites, compras más directamente desde el panel.",
  },
  {
    q: "¿Necesito tarjeta de crédito para comenzar?",
    a: "No. Te registras, recibes tus créditos y puedes crear tu primer evento sin pagar nada. Solo recargas cuando los créditos se terminan.",
  },
  {
    q: "¿Puedo personalizar el diseño de la landing del evento?",
    a: "Sí. Más de 20 temas visuales, colores de acento, imagen de portada, títulos y textos completamente editables.",
  },
  {
    q: "¿Las fotos se almacenan para siempre?",
    a: "Las fotos se guardan en tu cuenta mientras el evento esté activo. Puedes desactivarlo cuando quieras.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />

      {/* ── Trust bar ─────────────────────────────────────────── */}
      <div style={styles.trustBar}>
        <div className="container">
          <div style={styles.trustInner}>
            {[
              { icon: "⚡", text: "Fotos en pantalla en segundos" },
              { icon: "📱", text: "Sin apps ni cuentas para invitados" },
              { icon: "🎨", text: "20+ temas visuales" },
              { icon: "🛡", text: "Moderación de contenido incluida" },
              { icon: "🚀", text: "Evento activo en 3 minutos" },
            ].map((item) => (
              <div key={item.text} style={styles.trustItem}>
                <span style={styles.trustIcon}>{item.icon}</span>
                <span style={styles.trustText}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cómo funciona ─────────────────────────────────────── */}
      <section className="section" id="como-funciona">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="serif" style={styles.h2}>
              De cero a galería
              <br />
              en 3 pasos.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              No hay que ser técnico. Si puedes mandar un mensaje de WhatsApp, puedes usar Nilo Cam.
            </p>
          </div>

          <div style={styles.stepList}>
            {howItWorks.map((item, i) => (
              <div
                key={item.step}
                className="home-step-row"
                style={{
                  ...styles.stepRow,
                  borderBottom:
                    i < howItWorks.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
                }}
              >
                <span style={styles.stepNum}>0{item.step}</span>
                <div style={styles.stepBody}>
                  <h3 style={styles.stepTitle}>{item.title}</h3>
                  <p className="muted" style={styles.stepText}>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.stepCta}>
            <Link href="/auth" className="btn btn-primary" style={{ padding: "14px 32px", fontSize: 16 }}>
              Crear mi primer evento gratis →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Qué incluye ───────────────────────────────────────── */}
      <section className="section" style={{ background: "rgba(0,0,0,0.02)" }}>
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Todo incluido</span>
            <h2 className="serif" style={styles.h2}>
              Una herramienta
              <br />
              completa.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Todo lo que necesitas para que las fotos de tu evento sean la experiencia del evento.
            </p>
          </div>
          <div style={styles.featuresGrid}>
            {features.map((f) => (
              <div key={f.title} className="card glass" style={styles.featureItem}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p className="muted" style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipos de evento ───────────────────────────────────── */}
      <section className="section" id="tipos">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">10 tipos de evento</span>
            <h2 className="serif" style={styles.h2}>
              Hecho para
              <br />
              cada ocasión.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Desde bodas hasta lanzamientos corporativos. Cada tipo trae su propio estilo visual pre-configurado.
            </p>
          </div>
          <div className="home-event-cards" style={styles.cards}>
            {EVENT_TYPES.map((item, index) => (
              <article
                key={item.key}
                className="card glass"
                style={{ ...styles.card, ...styles[`card${(index % 4) + 1}` as keyof typeof styles] }}
              >
                <div style={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</div>
                <h3 style={styles.cardTitle}>{item.name}</h3>
                <p className="muted" style={styles.cardText}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Precios ───────────────────────────────────────────── */}
      <section className="section" id="precios" style={{ background: "rgba(0,0,0,0.02)" }}>
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Precios</span>
            <h2 className="serif" style={styles.h2}>
              Simple y
              <br />
              sin sorpresas.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Sin suscripciones mensuales. Sin contratos. Pagas solo lo que usas, cuando lo usas.
            </p>
          </div>

          {/* Pricing model cards */}
          <div style={styles.pricingGrid}>
            {/* Free to start */}
            <div className="card glass" style={{ ...styles.pricingCard, ...styles.pricingCardFeatured }}>
              <div style={styles.pricingBadge}>Recomendado para empezar</div>
              <div style={styles.pricingPill}>Gratis</div>
              <h3 style={styles.pricingTitle}>Registro sin costo</h3>
              <p className="muted" style={styles.pricingDesc}>
                Crea tu cuenta y recibe créditos de bienvenida automáticamente. Úsalos para crear tu primer evento y vivir la experiencia completa antes de pagar nada.
              </p>
              <ul style={styles.pricingList}>
                {[
                  "Créditos de bienvenida incluidos",
                  "Crea y activa tu primer evento",
                  "Galería en tiempo real",
                  "QR descargable",
                  "Moderación de fotos",
                  "Sin tarjeta de crédito",
                ].map((item) => (
                  <li key={item} style={styles.pricingListItem}>
                    <span style={styles.checkIcon}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="btn btn-primary" style={{ width: "100%", textAlign: "center", padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
                Crear cuenta gratis →
              </Link>
            </div>

            {/* Pay as you go */}
            <div className="card glass" style={styles.pricingCard}>
              <div style={styles.pricingPill}>Créditos</div>
              <h3 style={styles.pricingTitle}>Paga lo que usas</h3>
              <p className="muted" style={styles.pricingDesc}>
                Cuando tus créditos se terminen, recarga desde el panel. Sin mensualidad, sin renovación automática. Tus créditos no vencen.
              </p>
              <ul style={styles.pricingList}>
                {[
                  "Recarga desde el panel en minutos",
                  "Tarjeta (Stripe), PayPal o transferencia",
                  "Los créditos no tienen fecha de expiración",
                  "Descuentos por volumen disponibles",
                  "Factura disponible a petición",
                  "Soporte por email incluido",
                ].map((item) => (
                  <li key={item} style={styles.pricingListItem}>
                    <span style={styles.checkIcon}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="btn btn-secondary" style={{ width: "100%", textAlign: "center", padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
                Ver opciones de recarga →
              </Link>
            </div>

            {/* What costs credits */}
            <div className="card glass" style={{ ...styles.pricingCard, background: "rgba(0,0,0,0.03)" }}>
              <div style={styles.pricingPill}>¿Qué son los créditos?</div>
              <h3 style={styles.pricingTitle}>Tu moneda de evento</h3>
              <p className="muted" style={styles.pricingDesc}>
                Los créditos son la unidad de uso de la plataforma. Se consumen al crear eventos y al añadir fotos a las galerías.
              </p>
              <div style={styles.creditExamples}>
                {[
                  { action: "Registro en la plataforma", label: "Gratis + créditos incluidos" },
                  { action: "Crear un evento nuevo", label: "Pocos créditos" },
                  { action: "Cada foto en la galería", label: "Mínimo por foto" },
                  { action: "Los invitados participan", label: "Sin costo adicional" },
                  { action: "Descargar el QR", label: "Incluido" },
                  { action: "Pantalla de proyección", label: "Incluido" },
                ].map((ex) => (
                  <div key={ex.action} style={styles.creditRow}>
                    <span style={styles.creditAction}>{ex.action}</span>
                    <span style={styles.creditLabel}>{ex.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth" className="btn btn-ghost" style={{ width: "100%", textAlign: "center", padding: "14px 0", fontSize: 15, marginTop: 8 }}>
                Empezar gratis y ver precios →
              </Link>
            </div>
          </div>

          {/* Bottom note */}
          <p style={styles.pricingNote}>
            Todos los precios se muestran en USD. Los créditos de bienvenida se acreditan automáticamente al crear la cuenta.
            Si tienes un evento grande o necesitas un plan personalizado,{" "}
            <a href="mailto:tech@pasosalexito.com" style={{ color: "inherit", fontWeight: 600 }}>
              contáctanos
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2 className="serif" style={styles.h2}>
              Todo lo que
              <br />
              quieres saber.
            </h2>
          </div>
          <div style={styles.faqGrid}>
            {faqs.map((item) => (
              <div key={item.q} className="card glass" style={styles.faqItem}>
                <h3 style={styles.faqQ}>{item.q}</h3>
                <p className="muted" style={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="section demo-section" id="demo" style={styles.ctaSection}>
        <div className="container">
          <div style={styles.ctaInner}>
            <div style={styles.ctaLeft}>
              <span className="eyebrow" style={{ color: "rgba(255,255,255,0.45)" }}>
                Empieza hoy
              </span>
              <h2 className="serif" style={styles.ctaTitle}>
                Tu próximo evento
                <br />
                merece esto.
              </h2>
              <p style={styles.ctaText}>
                Crea tu cuenta gratis, configura tu evento en minutos y comparte el QR.
                Tus invitados harán el resto.
              </p>
              <div style={styles.ctaPills}>
                {["Sin instalación", "Sin tarjeta", "Listo en 3 min"].map((t) => (
                  <span key={t} style={styles.ctaPill}>{t}</span>
                ))}
              </div>
            </div>
            <div style={styles.ctaActions}>
              <Link className="btn btn-primary" href="/auth" style={styles.ctaBtnPrimary}>
                Empezar gratis →
              </Link>
              <Link className="btn btn-ghost" href="/event/demo-nilo-cam" style={styles.ctaBtnSecondary}>
                Ver demo en vivo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  /* Section headers */
  sectionHead: {
    display: "grid",
    gap: 14,
    maxWidth: 820,
    marginBottom: 48,
  },
  h2: {
    fontSize: "clamp(38px, 4.4vw, 70px)",
    lineHeight: 0.94,
    margin: 0,
    letterSpacing: "-0.05em",
  },
  sectionLead: {
    fontSize: 18,
    lineHeight: 1.65,
    maxWidth: 560,
    margin: 0,
  },

  /* Trust bar */
  trustBar: {
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    padding: "0",
    background: "#fff",
  },
  trustInner: {
    display: "flex",
    flexWrap: "wrap",
    gap: 0,
    justifyContent: "space-between",
    alignItems: "center",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 20px",
    flex: "1 1 180px",
    borderRight: "1px solid rgba(0,0,0,0.05)",
  },
  trustIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  trustText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    lineHeight: 1.3,
  },

  /* Steps */
  stepList: {
    display: "grid",
    gap: 0,
  },
  stepRow: {
    display: "grid",
    gridTemplateColumns: "minmax(72px, 96px) 1fr",
    gap: 40,
    padding: "44px 0",
    alignItems: "start",
  },
  stepNum: {
    fontSize: "clamp(52px, 5vw, 80px)",
    fontWeight: 800,
    letterSpacing: "-0.06em",
    lineHeight: 1,
    color: "rgba(0,0,0,0.08)",
    paddingTop: 4,
  },
  stepBody: {
    display: "grid",
    gap: 10,
  },
  stepTitle: {
    margin: 0,
    fontSize: "clamp(26px, 2.8vw, 42px)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  stepText: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.75,
    maxWidth: 560,
  },
  stepCta: {
    marginTop: 48,
    display: "flex",
    justifyContent: "flex-start",
  },

  /* Features grid */
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  featureItem: {
    borderRadius: 24,
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  featureIcon: {
    fontSize: 28,
    lineHeight: 1,
  },
  featureTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  featureDesc: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
  },

  /* Event type cards */
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 28,
    minHeight: 180,
    padding: 20,
    display: "grid",
    alignContent: "space-between",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78))",
  },
  card1: { minHeight: 210 },
  card2: { minHeight: 195 },
  card3: { minHeight: 225 },
  card4: { minHeight: 205 },
  cardIndex: {
    width: "fit-content",
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.04)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
  },
  cardTitle: {
    margin: 0,
    fontSize: "clamp(22px, 2vw, 28px)",
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
  },
  cardText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
  },

  /* Pricing */
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  pricingCard: {
    borderRadius: 28,
    padding: "28px 26px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78))",
  },
  pricingCardFeatured: {
    border: "2px solid rgba(0,0,0,0.14)",
    background: "#ffffff",
    boxShadow: "0 8px 40px rgba(0,0,0,0.07)",
  },
  pricingBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#059669",
    background: "rgba(5,150,105,0.1)",
    border: "1px solid rgba(5,150,105,0.2)",
    borderRadius: 999,
    padding: "4px 12px",
    width: "fit-content",
  },
  pricingPill: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--muted)",
    background: "rgba(0,0,0,0.05)",
    borderRadius: 999,
    padding: "4px 12px",
    width: "fit-content",
  },
  pricingTitle: {
    margin: 0,
    fontSize: "clamp(22px, 2vw, 28px)",
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  pricingDesc: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.65,
  },
  pricingList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  pricingListItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
  },
  checkIcon: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "rgba(5,150,105,0.1)",
    color: "#059669",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
  },
  creditExamples: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.07)",
    overflow: "hidden",
    background: "#fff",
  },
  creditRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    gap: 10,
  },
  creditAction: {
    fontSize: 13,
    color: "#374151",
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#059669",
    flexShrink: 0,
  },
  pricingNote: {
    marginTop: 32,
    fontSize: 14,
    color: "var(--muted)",
    lineHeight: 1.65,
    textAlign: "center" as const,
  },

  /* FAQ */
  faqGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 16,
  },
  faqItem: {
    borderRadius: 24,
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  faqQ: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
  },
  faqA: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
  },

  /* Final CTA section */
  ctaSection: {
    background: "#0b0b0f",
    paddingTop: 96,
    paddingBottom: 96,
  },
  ctaInner: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 48,
    flexWrap: "wrap",
  },
  ctaLeft: {
    display: "grid",
    gap: 20,
    maxWidth: 720,
  },
  ctaTitle: {
    margin: 0,
    fontSize: "clamp(40px, 9vw, 112px)",
    lineHeight: 0.88,
    letterSpacing: "-0.05em",
    color: "#ffffff",
  },
  ctaText: {
    fontSize: 18,
    lineHeight: 1.75,
    margin: 0,
    color: "rgba(255,255,255,0.55)",
    maxWidth: 520,
  },
  ctaPills: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  ctaPill: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "5px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.65)",
  },
  ctaActions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flexShrink: 0,
    minWidth: 220,
  },
  ctaBtnPrimary: {
    background: "#ffffff",
    color: "#0b0b0f",
    textAlign: "center" as const,
    padding: "16px 32px",
    fontSize: 16,
    fontWeight: 700,
  },
  ctaBtnSecondary: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center" as const,
    padding: "16px 32px",
    fontSize: 15,
  },
};
