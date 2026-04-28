import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";

// ─── Data ────────────────────────────────────────────────────────────────────

const howItWorks = [
  {
    step: "1",
    title: "Crea tu evento en 3 minutos",
    text: "Ponle nombre, elige el diseño y decide si quieres revisar las fotos antes de que aparezcan. No necesitas saber de tecnología — si sabes usar WhatsApp, puedes usar Memorica.",
  },
  {
    step: "2",
    title: "Comparte el QR y listo",
    text: "Ponlo en la mesa, proyéctalo en la sala o mándalo por WhatsApp. El invitado lo abre desde su celular y ya está dentro — sin apps, sin contraseña, sin nada raro.",
  },
  {
    step: "3",
    title: "Todos la ven al instante desde su celular",
    text: "La foto aparece en la galería del evento en segundos — cada invitado la ve desde su propio teléfono en tiempo real. Si tienes pantalla o proyector, también sale ahí. Ese momento de \"¡ahí salgo yo!\" no tiene precio.",
  },
];

const features = [
  {
    icon: "📸",
    title: "Todos la ven al mismo tiempo",
    desc: "La foto aparece en la galería en segundos — cada invitado la ve desde su propio celular en tiempo real, y también en la pantalla grande si tienes proyector.",
  },
  {
    icon: "🔗",
    title: "Un QR para todo",
    desc: "Un código y tus invitados ya están dentro. Ponlo en las mesas, proyéctalo o mándalo por mensaje. Sin explicaciones.",
  },
  {
    icon: "🤖",
    title: "Cada quien encuentra sus fotos",
    desc: "La IA agrupa todas las caras del evento por persona. Con una selfie, cada invitado ve todas las fotos donde aparece — sin buscar nada.",
    highlight: true,
  },
  {
    icon: "🔍",
    title: "Se acabó el \"mándame las fotos\"",
    desc: "Selfie → fotos tuyas. Al instante. Sin pedirle nada al organizador. Funciona para todos los invitados sin que hagan nada extra.",
    highlight: true,
  },
  {
    icon: "🎨",
    title: "Tu diseño, tu estilo",
    desc: "Más de 20 temas visuales con colores, tipografía y portada propios. La galería de tu boda se ve como una boda, no como una app genérica.",
  },
  {
    icon: "🛡",
    title: "Tú controlas qué aparece",
    desc: "¿Prefieres revisar cada foto antes de que se vea en pantalla? Activa la moderación. ¿Quieres que todo sea automático? También puedes.",
  },
  {
    icon: "📺",
    title: "Y también en pantalla grande",
    desc: "Además de verse en el celular de cada invitado, puedes proyectar un slideshow en el salón. Cuando llega una foto nueva, aparece sola. La reacción es inmediata.",
  },
  {
    icon: "📱",
    title: "Cero fricción para tus invitados",
    desc: "Cualquier celular, cualquier marca. Sin apps, sin cuenta, sin contraseña. El 100% de tus invitados puede participar sin ayuda.",
  },
  {
    icon: "🎞",
    title: "Filtros y marcos al instante",
    desc: "15 filtros de cámara y 8 marcos. Las fotos salen con estilo desde el primer momento, sin editar nada después.",
  },
  {
    icon: "⚡",
    title: "Activo en 3 minutos",
    desc: "En el tiempo que tardas en tomarte un café, tienes el evento listo, el QR generado y la galería funcionando.",
  },
];

const faqs = [
  {
    q: "¿En qué se diferencia de mandar las fotos por WhatsApp o Google Photos?",
    a: "WhatsApp y Google Photos son para después del evento. Memorica es durante. Cada foto aparece en la galería en tiempo real — todos la ven desde su celular al instante, y también en la pantalla grande si hay proyector. El momento se comparte en el momento. Además, cada invitado puede encontrar sus fotos con una selfie, sin pedirte nada.",
  },
  {
    q: "¿Mis invitados tienen que instalar algo?",
    a: "No. Solo escanean el QR con la cámara de su celular y listo. No hay apps, no hay cuentas, no hay contraseñas. Si saben usar WhatsApp, pueden usar Memorica.",
  },
  {
    q: "¿Funciona para invitados mayores que no son muy tecnológicos?",
    a: "Sí, es lo más sencillo que existe. Si saben abrir el navegador del teléfono, pueden participar. Solo escanean el QR, eligen su foto y listo. Sin formularios, sin registros, sin nada raro.",
  },
  {
    q: "¿Cómo funciona lo de encontrar mis fotos con selfie?",
    a: "Abres la galería del evento, tocas \"Mis fotos\", te haces una selfie y en segundos aparecen todas las fotos del evento donde apareces tú. La IA compara tu cara con todas las fotos automáticamente. No necesitas cuenta ni app. Es completamente privado — tus datos no se comparten con nadie.",
  },
  {
    q: "¿Necesito tarjeta de crédito para comenzar?",
    a: "No. Te registras, recibes créditos de bienvenida y puedes crear tu primer evento sin pagar nada. Solo recargas cuando los créditos se acaben.",
  },
  {
    q: "¿Puedo personalizar el diseño de la galería?",
    a: "Sí. Más de 20 temas visuales con colores, tipografía, imagen de portada y textos completamente editables. La galería de tu boda se ve como una boda, la de tu empresa como tu empresa.",
  },
  {
    q: "¿Las fotos se ven solo en el evento o también después?",
    a: "Ambas. Durante el evento se ven en vivo en la galería (y en la pantalla grande si tienes proyector). Después, el enlace sigue activo para que todos puedan descargar sus fotos cuando quieran.",
  },
];

const faceSteps = [
  {
    num: "01",
    icon: "📸",
    title: "La IA escanea todas las fotos",
    desc: "Con un clic, la IA analiza cada foto del evento y reconoce todas las caras que aparecen. Automático. Sin configurar nada.",
    color: "#6366f1",
  },
  {
    num: "02",
    icon: "🧩",
    title: "Organiza a cada persona",
    desc: "Las fotos se agrupan por persona solas. Puedes ponerle nombre a cada grupo si quieres. Tus invitados quedan asombrados cuando lo ven.",
    color: "#8b5cf6",
  },
  {
    num: "03",
    icon: "🔍",
    title: "Cada quien busca las suyas",
    desc: "El invitado abre la galería, toca \"Mis fotos\", se hace una selfie y aparecen todas las fotos del evento donde sale él. Sin cuenta. Sin apps. Al instante.",
    color: "#a78bfa",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />

      {/* ── Trust bar ─────────────────────────────────────── */}
      <div style={styles.trustBar}>
        <div className="container">
          <div className="home-trust-inner" style={styles.trustInner}>
            {[
              { icon: "📸", text: "Todos la ven en su cel al instante" },
              { icon: "🤖", text: "Encuentra tus fotos con una selfie" },
              { icon: "📱", text: "Sin apps · Sin registro" },
              { icon: "🎨", text: "20+ diseños listos para usar" },
              { icon: "⚡", text: "Tu evento activo en 3 minutos" },
            ].map((item) => (
              <div key={item.text} style={styles.trustItem}>
                <span style={styles.trustIcon}>{item.icon}</span>
                <span style={styles.trustText}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── IA Facial Spotlight ────────────────────────────── */}
      <section style={styles.aiSection} className="ai-spotlight" id="ia-facial">
        <div className="container">
          {/* Eyebrow */}
          <div style={styles.aiBadgeRow}>
            <span style={styles.aiDot} />
            <span style={styles.aiEyebrow}>Nuevo · Reconocimiento facial inteligente</span>
          </div>

          {/* Headline */}
          <div style={styles.aiHeadWrap} className="ai-head-wrap">
            <h2 style={styles.aiHeadline}>
              Cada persona
              <br />
              <span style={styles.aiHeadlineDim}>encuentra</span>
              <br />
              sus fotos.
            </h2>
            <div style={styles.aiHeadRight}>
              <p style={styles.aiLead}>
                Ya no hay que buscar tu cara en 400 fotos ni pedirle el álbum al organizador.
                La IA organiza sola las fotos por persona — y cada invitado encuentra las suyas
                con una selfie, en segundos.
              </p>
              <div style={styles.aiTagList}>
                {["Sin apps externas", "100% privado", "Sin registro para invitados", "Grupos automáticos", "Filtros por persona", "Búsqueda con selfie"].map((t) => (
                  <span key={t} style={styles.aiTag}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div style={styles.aiSteps} className="ai-steps">
            {faceSteps.map((step, i) => (
              <div key={step.num} style={styles.aiStep}>
                {/* Top row: number left, icon right */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ ...styles.aiStepNum, color: step.color }}>{step.num}</span>
                  <div style={{ ...styles.aiStepIcon, background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                    {step.icon}
                  </div>
                </div>
                <h3 style={styles.aiStepTitle}>{step.title}</h3>
                <p style={styles.aiStepDesc}>{step.desc}</p>
                {/* Connector arrow between cards */}
                {i < faceSteps.length - 1 && (
                  <div style={styles.aiStepConnector}>
                    <span style={{ color: step.color, opacity: 0.5 }}>↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom visual demo strip */}
          <div style={styles.aiDemoStrip} className="ai-demo-strip">
            {/* Photos side */}
            <div style={styles.aiDemoLeft}>
              <div style={styles.aiDemoSectionHead}>
                <span style={styles.aiDemoDot} />
                <span style={styles.aiDemoLabel}>Fotos del evento</span>
              </div>
              <div style={styles.aiDemoPhotos}>
                {[
                  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=160&h=160&fit=crop&auto=format",
                  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=160&h=160&fit=crop&auto=format",
                  "https://images.unsplash.com/photo-1519741497674-611481863552?w=160&h=160&fit=crop&auto=format",
                  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=160&h=160&fit=crop&auto=format",
                ].map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    style={{
                      ...styles.aiDemoPhoto,
                      marginLeft: idx > 0 ? -14 : 0,
                      zIndex: 4 - idx,
                      position: "relative",
                    }}
                  />
                ))}
                <div style={styles.aiDemoMoreBadge}>+128</div>
              </div>
            </div>

            {/* Arrow center */}
            <div style={styles.aiDemoCenter} className="ai-demo-center">
              <div style={styles.aiDemoPulse} />
              <span style={styles.aiDemoArrow}>→</span>
              <span style={styles.aiDemoArrowLabel}>IA detecta</span>
            </div>

            {/* Persons side */}
            <div style={styles.aiDemoRight}>
              <div style={styles.aiDemoSectionHead}>
                <span style={{ ...styles.aiDemoDot, background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
                <span style={styles.aiDemoLabel}>Personas identificadas</span>
              </div>
              <div style={styles.aiPersonCards}>
                {[
                  { name: "Ana García", handle: "@anagarcia", color: "#6366f1", count: 34 },
                  { name: "Carlos M.", handle: "@carlosm_", color: "#8b5cf6", count: 21 },
                  { name: "Laura R.", handle: "@laurarod", color: "#a78bfa", count: 18 },
                ].map((p) => (
                  <div key={p.name} style={styles.aiPersonCard}>
                    <div style={{ ...styles.aiPersonAvatar, background: `${p.color}20`, border: `2px solid ${p.color}50` }}>
                      <span style={{ color: p.color, fontWeight: 800, fontSize: 16 }}>
                        {p.name.charAt(0)}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.aiPersonName}>{p.name}</div>
                      <div style={{ ...styles.aiPersonHandle, color: p.color }}>{p.handle}</div>
                    </div>
                    <span style={{ ...styles.aiPersonCount, background: `${p.color}18`, color: p.color }}>
                      {p.count} fotos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <Link href="/auth" className="btn" style={styles.aiCta}>
              Probarlo gratis en mi próximo evento →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────── */}
      <section className="section" id="como-funciona">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="serif" style={styles.h2}>
              Tan fácil como
              <br />
              mandar un mensaje.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              No necesitas saber de tecnología. Si sabes usar WhatsApp, puedes usar Memorica.
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

      {/* ── Qué incluye ───────────────────────────────────── */}
      <section className="section" style={{ background: "rgba(0,0,0,0.02)" }}>
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Todo incluido</span>
            <h2 className="serif" style={styles.h2}>
              Funciona de verdad.
              <br />
              Para todos.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Mientras otras apps guardan fotos para después, Memorica las convierte en el centro de la fiesta — mientras la fiesta pasa.
            </p>
          </div>
          <div style={styles.featuresGrid}>
            {features.map((f) => (
              <div
                key={f.title}
                className="card glass"
                style={{
                  ...styles.featureItem,
                  ...(f.highlight ? styles.featureHighlight : {}),
                }}
              >
                {f.highlight && <span style={styles.featureNewBadge}>Nuevo</span>}
                <span style={styles.featureIcon}>{f.icon}</span>
                <h3 style={{ ...styles.featureTitle, ...(f.highlight ? { color: "#ffffff" } : {}) }}>
                  {f.title}
                </h3>
                <p
                  className={f.highlight ? undefined : "muted"}
                  style={{ ...styles.featureDesc, ...(f.highlight ? { color: "rgba(255,255,255,0.55)" } : {}) }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipos de evento ───────────────────────────────── */}
      <section className="section" id="tipos">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">10 tipos de evento</span>
            <h2 className="serif" style={styles.h2}>
              Para la boda, la
              <br />
              quinceañera
              <br />
              y mucho más.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Cada tipo de evento tiene su propio estilo visual ya configurado. Solo elige el tuyo y personaliza los detalles.
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

      {/* ── Precios ───────────────────────────────────────── */}
      <section className="section" id="precios" style={{ background: "rgba(0,0,0,0.02)" }}>
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Precios</span>
            <h2 className="serif" style={styles.h2}>
              Empieza gratis.
              <br />
              Paga cuando
              <br />
              lo uses.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Sin mensualidad. Sin contrato. Sin sorpresas al final. Pagas solo lo que necesitas, cuando lo necesitas.
            </p>
          </div>

          <div className="home-pricing-grid" style={styles.pricingGrid}>
            <div className="card glass" style={{ ...styles.pricingCard, ...styles.pricingCardFeatured }}>
              <div style={styles.pricingBadge}>Empieza aquí</div>
              <div style={styles.pricingPill}>Gratis</div>
              <h3 style={styles.pricingTitle}>Tu primer evento sin pagar nada</h3>
              <p className="muted" style={styles.pricingDesc}>
                Crea tu cuenta y recibe créditos de bienvenida al instante. Úsalos para crear tu primer evento real y ver con tus propios ojos cómo funciona — sin tarjeta.
              </p>
              <ul style={styles.pricingList}>
                {[
                  "Créditos de bienvenida incluidos",
                  "Crea y activa tu primer evento",
                  "Galería en tiempo real",
                  "QR descargable",
                  "Moderación de fotos",
                  "IA facial incluida",
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

            <div className="card glass" style={styles.pricingCard}>
              <div style={styles.pricingPill}>Créditos</div>
              <h3 style={styles.pricingTitle}>Recarga solo cuando los necesites</h3>
              <p className="muted" style={styles.pricingDesc}>
                Cuando tus créditos se terminen, recargas desde el panel en minutos. Sin mensualidad, sin cobro automático. Tus créditos no tienen fecha de vencimiento.
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

            <div className="card glass" style={{ ...styles.pricingCard, background: "rgba(0,0,0,0.03)" }}>
              <div style={styles.pricingPill}>¿Cómo funciona?</div>
              <h3 style={styles.pricingTitle}>Los créditos son simples</h3>
              <p className="muted" style={styles.pricingDesc}>
                Los créditos son la unidad de uso de Memorica. Se gastan al crear eventos y al añadir fotos. Los invitados participan sin costo adicional.
              </p>
              <div style={styles.creditExamples}>
                {[
                  { action: "Registro en la plataforma", label: "Gratis + créditos" },
                  { action: "Crear un evento nuevo", label: "Pocos créditos" },
                  { action: "Cada foto en la galería", label: "Mínimo por foto" },
                  { action: "Los invitados participan", label: "Sin costo extra" },
                  { action: "IA facial del evento", label: "Incluido" },
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

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2 className="serif" style={styles.h2}>
              Seguro tienes
              <br />
              alguna duda.
            </h2>
            <p className="muted" style={styles.sectionLead}>
              Las preguntas que más nos hacen antes del primer evento.
            </p>
          </div>
          <div className="home-faq-grid" style={styles.faqGrid}>
            {faqs.map((item) => (
              <div key={item.q} className="card glass" style={styles.faqItem}>
                <h3 style={styles.faqQ}>{item.q}</h3>
                <p className="muted" style={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────── */}
      <section className="section demo-section" id="demo" style={styles.ctaSection}>
        <div className="container">
          <div style={styles.ctaInner}>
            <div style={styles.ctaLeft}>
              <span className="eyebrow" style={{ color: "rgba(255,255,255,0.45)" }}>
                Empieza hoy
              </span>
              <h2 className="serif" style={styles.ctaTitle}>
                La próxima boda,
                <br />
                quinceañera o
                <br />
                cumpleaños
                <br />
                que recuerden.
              </h2>
              <p style={styles.ctaText}>
                Crea tu cuenta gratis. Ten el QR listo antes de que lleguen tus invitados.
                Y disfruta viendo cómo las fotos aparecen en el celular de todos — y en la
                pantalla grande — mientras la fiesta pasa.
              </p>
              <div style={styles.ctaPills}>
                {["Sin apps para tus invitados", "Sin tarjeta de crédito", "Listo en 3 minutos", "IA facial incluida"].map((t) => (
                  <span key={t} style={styles.ctaPill}>{t}</span>
                ))}
              </div>
            </div>
            <div style={styles.ctaActions}>
              <Link className="btn btn-primary" href="/auth" style={styles.ctaBtnPrimary}>
                Empezar gratis →
              </Link>
              <Link className="btn btn-ghost" href="/event/demo-memorica" style={styles.ctaBtnSecondary}>
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
    padding: "14px 18px",
    flex: "1 1 160px",
  },
  trustIcon: { fontSize: 16, flexShrink: 0 },
  trustText: { fontSize: 13, fontWeight: 600, color: "#374151", lineHeight: 1.3 },

  /* Steps */
  stepList: { display: "grid", gap: 0 },
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
  stepBody: { display: "grid", gap: 10 },
  stepTitle: {
    margin: 0,
    fontSize: "clamp(26px, 2.8vw, 42px)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  stepText: { margin: 0, fontSize: 17, lineHeight: 1.75, maxWidth: 560 },
  stepCta: { marginTop: 48, display: "flex", justifyContent: "flex-start" },

  /* ── AI Facial Spotlight ── */
  aiSection: {
    background: "linear-gradient(180deg, #06070f 0%, #0c0e1a 50%, #0a0c18 100%)",
    padding: "96px 0",
    position: "relative",
    overflow: "hidden",
  },
  aiBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 40,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22d3ee",
    boxShadow: "0 0 12px #22d3ee, 0 0 4px #22d3ee",
    flexShrink: 0,
  },
  aiEyebrow: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
  },
  aiHeadWrap: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 48,
    flexWrap: "wrap",
    marginBottom: 72,
  },
  aiHeadline: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(38px, 5.5vw, 88px)",
    lineHeight: 0.91,
    letterSpacing: "-0.05em",
    fontFamily: "inherit",
  },
  aiHeadlineDim: {
    color: "rgba(255,255,255,0.2)",
  },
  aiHeadRight: {
    maxWidth: 480,
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
    paddingTop: 8,
  },
  aiLead: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 18,
    lineHeight: 1.7,
    margin: 0,
  },
  aiTagList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  aiTag: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    padding: "5px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.5)",
  },
  aiSteps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  aiStep: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
    position: "relative" as const,
  },
  aiStepNum: {
    fontSize: 56,
    fontWeight: 800,
    letterSpacing: "-0.07em",
    lineHeight: 1,
    fontFamily: "inherit",
  },
  aiStepConnector: {
    position: "absolute" as const,
    bottom: -28,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 18,
    lineHeight: 1,
    display: "none",
  },
  aiStepIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    flexShrink: 0,
  },
  aiStepTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
  },
  aiStepDesc: {
    margin: 0,
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    lineHeight: 1.75,
  },
  /* Demo strip */
  aiDemoStrip: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 24,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: "32px 36px",
    marginTop: 12,
  },
  aiDemoSectionHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  aiDemoDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#6366f1",
    boxShadow: "0 0 8px #6366f1",
    flexShrink: 0,
  },
  aiDemoLeft: { display: "flex", flexDirection: "column" as const },
  aiDemoLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase" as const,
  },
  aiDemoPhotos: { display: "flex", alignItems: "center" },
  aiDemoPhoto: {
    width: 72,
    height: 72,
    borderRadius: 12,
    objectFit: "cover" as const,
    border: "2px solid rgba(255,255,255,0.06)",
  },
  aiDemoMoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    border: "2px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.3)",
    flexShrink: 0,
    marginLeft: -14,
    zIndex: 0,
    position: "relative" as const,
  },
  aiDemoCenter: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  aiDemoPulse: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22d3ee",
    boxShadow: "0 0 16px #22d3ee",
  },
  aiDemoArrow: { fontSize: 22, color: "rgba(255,255,255,0.2)", flexShrink: 0 },
  aiDemoArrowLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.2)",
    textTransform: "uppercase" as const,
  },
  aiDemoRight: { display: "flex", flexDirection: "column" as const },
  aiPersonCards: { display: "flex", flexDirection: "column" as const, gap: 10 },
  aiPersonCard: { display: "flex", alignItems: "center", gap: 12 },
  aiPersonAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiPersonName: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.3 },
  aiPersonHandle: { fontSize: 11, fontWeight: 500, marginTop: 1 },
  aiPersonCount: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    flexShrink: 0,
  },
  aiCta: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#ffffff",
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    backdropFilter: "blur(8px)",
  },

  /* Features grid */
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
  featureItem: {
    borderRadius: 24,
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    position: "relative" as const,
  },
  featureHighlight: {
    background: "linear-gradient(135deg, #0f1020 0%, #161830 100%)",
    border: "1px solid rgba(99,102,241,0.35)",
    boxShadow: "0 0 40px rgba(99,102,241,0.12)",
  },
  featureNewBadge: {
    position: "absolute" as const,
    top: 14,
    right: 14,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#a78bfa",
    background: "rgba(167,139,250,0.14)",
    border: "1px solid rgba(167,139,250,0.3)",
    borderRadius: 999,
    padding: "3px 8px",
  },
  featureIcon: { fontSize: 28, lineHeight: 1 },
  featureTitle: { margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" },
  featureDesc: { margin: 0, fontSize: 14, lineHeight: 1.65 },

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
  cardText: { margin: 0, fontSize: 15, lineHeight: 1.6 },

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
    flexDirection: "column" as const,
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
  pricingDesc: { margin: 0, fontSize: 15, lineHeight: 1.65 },
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
  creditAction: { fontSize: 13, color: "#374151" },
  creditLabel: { fontSize: 12, fontWeight: 700, color: "#059669", flexShrink: 0 },
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
    gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
    gap: 16,
  },
  faqItem: {
    borderRadius: 24,
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  faqQ: { margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 },
  faqA: { margin: 0, fontSize: 14, lineHeight: 1.7 },

  /* Final CTA */
  ctaSection: { background: "#0b0b0f", paddingTop: 96, paddingBottom: 96 },
  ctaInner: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 48,
    flexWrap: "wrap",
  },
  ctaLeft: { display: "grid", gap: 20, maxWidth: 720 },
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
  ctaPills: { display: "flex", gap: 8, flexWrap: "wrap" as const },
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
    flexDirection: "column" as const,
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
