import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";

const featuredSlides = [
  {
    title: "Una URL. Una identidad.",
    text: "Cada evento vive en su propia landing: título, estilo y galería en un solo lugar. Lista para compartir en segundos.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Inmediato. Sin espera.",
    text: "La foto que toma un invitado aparece en pantalla grande antes de que baje el teléfono.",
    image:
      "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=1400&q=80",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Diseñas la experiencia",
    text: "Elige el nombre, el estilo visual, el tipo de evento y cómo quieres moderar las fotos. Listo en minutos, sin tecnicismos.",
  },
  {
    step: "2",
    title: "Un QR lo activa todo",
    text: "Imprímelo, proyéctalo o compártelo por mensaje. Al abrirlo, el invitado ya está dentro, sin apps ni cuentas.",
  },
  {
    step: "3",
    title: "Las fotos llegan solas",
    text: "Cada captura aparece destacada en la galería del evento, en vivo, mientras todo sucede a tu alrededor.",
  },
];

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />

      {/* ── Cómo funciona ─────────────────────────────────── */}
      <section className="section" id="como-funciona">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="serif" style={styles.h2}>
              Tan simple que no
              <br />
              necesita manual.
            </h2>
          </div>

          <div style={styles.stepList}>
            {howItWorks.map((item, i) => (
              <div
                key={item.step}
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
        </div>
      </section>

      {/* ── Features alternas ─────────────────────────────── */}
      <section className="section">
        <div className="container" style={styles.featureList}>
          {featuredSlides.map((slide, i) => (
            <article key={slide.title} className="card glass feature-card" style={styles.featureCard}>
              <div
                className="feature-img"
                style={{
                  backgroundImage: `url(${slide.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "grayscale(1) brightness(0.5) contrast(1.22)",
                  order: i % 2 === 0 ? 0 : 1,
                }}
              />
              <div
                className="feature-body"
                style={{
                  ...styles.featureBody,
                  order: i % 2 === 0 ? 1 : 0,
                }}
              >
                <h2 className="serif" style={styles.featureTitle}>
                  {slide.title}
                </h2>
                <p className="muted" style={styles.featureDesc}>
                  {slide.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Tipos de evento ───────────────────────────────── */}
      <section className="section" id="tipos">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">10 tipos de evento</span>
            <h2 className="serif" style={styles.h2}>
              Hecho para cada ocasión.
            </h2>
          </div>
          <div style={styles.cards}>
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

      {/* ── Demo CTA ──────────────────────────────────────── */}
      <section className="section" id="demo" style={styles.demoSection}>
        <div className="container">
          <div style={styles.demoCta}>
            <div style={styles.demoLeft}>
              <span className="eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
                Demostración
              </span>
              <h3 className="serif" style={styles.demoTitle}>
                Vívelo antes
                <br />
                de crearlo.
              </h3>
              <p style={styles.demoText}>
                Abre la demo y experimenta el flujo completo: escaneas, capturas el momento
                y ves tu foto aparecer en la galería del evento. En segundos, como debería
                ser siempre.
              </p>
            </div>
            <div style={styles.demoActions}>
              <Link className="btn btn-primary" href="/event/demo-nilo-cam" style={styles.demoBtnPrimary}>
                Abrir landing demo
              </Link>
              <Link className="btn btn-ghost" href="/admin" style={styles.demoBtnSecondary}>
                Ir al admin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionHead: {
    display: "grid",
    gap: 14,
    maxWidth: 820,
    marginBottom: 40,
  },
  h2: {
    fontSize: "clamp(38px, 4.4vw, 70px)",
    lineHeight: 0.94,
    margin: 0,
    letterSpacing: "-0.05em",
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

  /* Feature alternating */
  featureList: {
    display: "grid",
    gap: 16,
  },
  featureCard: {
    borderRadius: 36,
    overflow: "hidden",
    minHeight: 480,
    display: "grid",
    gridTemplateColumns: "55% 45%",
  },
  featureBody: {
    padding: "52px 48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 18,
  },
  featureTitle: {
    margin: 0,
    fontSize: "clamp(32px, 3.5vw, 54px)",
    lineHeight: 0.94,
    letterSpacing: "-0.05em",
  },
  featureDesc: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.75,
    maxWidth: 400,
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

  /* Demo CTA section */
  demoSection: {
    background: "#0b0b0f",
    paddingTop: 88,
    paddingBottom: 88,
  },
  demoCta: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 40,
    flexWrap: "wrap",
  },
  demoLeft: {
    display: "grid",
    gap: 18,
    maxWidth: 760,
  },
  demoTitle: {
    margin: 0,
    fontSize: "clamp(52px, 7vw, 104px)",
    lineHeight: 0.88,
    letterSpacing: "-0.05em",
    color: "#ffffff",
  },
  demoText: {
    fontSize: 18,
    lineHeight: 1.75,
    margin: 0,
    color: "rgba(255,255,255,0.55)",
    maxWidth: 520,
  },
  demoActions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flexShrink: 0,
  },
  demoBtnPrimary: {
    background: "#ffffff",
    color: "#0b0b0f",
    minWidth: 200,
  },
  demoBtnSecondary: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.7)",
    minWidth: 200,
  },
};
