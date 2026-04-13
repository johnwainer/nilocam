import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";

const featuredSlides = [
  {
    title: "Cada evento tiene su URL",
    text: "Compártela en el QR, en la mesa o en una pantalla. Funciona sin instalar nada.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Las fotos aparecen en vivo",
    text: "Lo que sube o se toma se ve destacado al instante en la landing del evento.",
    image:
      "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=1400&q=80",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Creas el evento",
    text: "El admin arma el título, estilo, moderación, límite de peso y URL personalizada.",
  },
  {
    step: "2",
    title: "Compartes el QR",
    text: "La gente entra desde iPhone o Android sin registro obligatorio y sin descargar nada.",
  },
  {
    step: "3",
    title: "Recibes fotos en vivo",
    text: "Las imágenes pasan por filtros/plantillas y aparecen destacadas en la landing.",
  },
];

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />

      <section className="section">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">Cómo se usa</span>
            <h2 className="serif" style={styles.h2}>
              Entiende la app en 10 segundos
            </h2>
            <p className="muted" style={styles.lead}>
              Nilo Cam convierte un QR en un álbum vivo para eventos: creas una landing, la compartes y las
              fotos empiezan a aparecer en tiempo real.
            </p>
          </div>
          <div style={styles.stepGrid}>
            {howItWorks.map((item) => (
              <article key={item.step} className="card glass" style={styles.stepCard}>
                <div style={styles.stepNumber}>{item.step}</div>
                <h3 style={styles.stepTitle}>{item.title}</h3>
                <p className="muted" style={styles.stepText}>
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={styles.featureRow}>
          {featuredSlides.map((slide) => (
            <article key={slide.title} className="card glass" style={styles.featureSlide}>
              <div style={{ ...styles.featureImage, backgroundImage: `url(${slide.image})` }} />
              <div style={styles.featureCopy}>
                <span className="eyebrow">{slide.title}</span>
                <p className="muted" style={styles.featureText}>
                  {slide.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={styles.sectionHead}>
            <span className="eyebrow">10 tipos de evento listos</span>
            <h2 className="serif" style={styles.h2}>
              Plantillas editoriales, limpias y listas para personalizar
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

      <section className="section" id="demo">
        <div className="container">
          <div className="card glass" style={styles.demo}>
            <div style={styles.demoCopy}>
              <span className="eyebrow">Demostración</span>
              <h3 className="serif" style={styles.demoTitle}>
                Una experiencia que el invitado entiende al instante
              </h3>
              <p className="muted" style={styles.demoText}>
                El QR lleva a una URL limpia. El invitado toca &quot;Tomar foto&quot; o &quot;Subir foto&quot;,
                decide si firma su nombre y ve su foto aparecer dentro del evento.
              </p>
            </div>
            <div style={styles.demoActions}>
              <Link className="btn btn-primary" href="/event/demo-nilo-cam">
                Abrir landing demo
              </Link>
              <Link className="btn btn-secondary" href="/admin">
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
    marginBottom: 24,
  },
  h2: {
    fontSize: "clamp(38px, 4.4vw, 70px)",
    lineHeight: 0.94,
    margin: 0,
    letterSpacing: "-0.05em",
  },
  lead: {
    fontSize: 18,
    lineHeight: 1.7,
    margin: 0,
  },
  stepGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  stepCard: {
    padding: 22,
    borderRadius: 28,
    minHeight: 230,
    display: "grid",
    gap: 12,
  },
  stepNumber: {
    width: "fit-content",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.04)",
    fontWeight: 800,
    letterSpacing: "0.14em",
    fontSize: 12,
  },
  stepTitle: {
    margin: 0,
    fontSize: "clamp(24px, 2vw, 30px)",
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
  },
  stepText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.65,
  },
  featureRow: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  featureSlide: {
    overflow: "hidden",
    borderRadius: 34,
    padding: 16,
    display: "grid",
    gap: 14,
  },
  featureImage: {
    minHeight: 300,
    borderRadius: 26,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "grayscale(1) brightness(0.55) contrast(1.2)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
  },
  featureCopy: {
    display: "grid",
    gap: 8,
  },
  featureText: {
    fontSize: 17,
    lineHeight: 1.7,
    margin: 0,
  },
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
  card1: {
    minHeight: 210,
  },
  card2: {
    minHeight: 195,
  },
  card3: {
    minHeight: 225,
  },
  card4: {
    minHeight: 205,
  },
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
  demo: {
    padding: 28,
    borderRadius: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.78)), radial-gradient(circle at top right, rgba(0,0,0,0.06), transparent 40%)",
  },
  demoCopy: {
    display: "grid",
    gap: 14,
    maxWidth: 760,
  },
  demoTitle: {
    margin: 0,
    fontSize: "clamp(32px, 3.7vw, 54px)",
    lineHeight: 0.96,
    letterSpacing: "-0.04em",
  },
  demoText: {
    fontSize: 18,
    lineHeight: 1.7,
    margin: 0,
  },
  demoActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
};
