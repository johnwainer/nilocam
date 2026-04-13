import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";

const featuredSlides = [
  {
    title: "Landing personalizada",
    text: "Cada evento puede tener su propio look, secciones y CTA.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Galería en vivo",
    text: "Las fotos subidas aparecen destacadas al instante.",
    image:
      "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&w=1400&q=80",
  },
];

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />

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
                Una experiencia de evento que se ve como producto premium
              </h3>
              <p className="muted" style={styles.demoText}>
                El QR puede llevar a una URL personalizada como <code>/event/tu-evento</code>. Desde ahí
                los invitados toman o suben fotos, aplican filtros, agregan nombre o permanecen anónimos.
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
  featureRow: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  featureSlide: {
    overflow: "hidden",
    borderRadius: 34,
    padding: 16,
    display: "grid",
    gap: 14,
  },
  featureImage: {
    minHeight: 340,
    borderRadius: 26,
    backgroundSize: "cover",
    backgroundPosition: "center",
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
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 28,
    minHeight: 210,
    padding: 20,
    display: "grid",
    alignContent: "space-between",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78))",
  },
  card1: {
    minHeight: 240,
  },
  card2: {
    minHeight: 220,
  },
  card3: {
    minHeight: 260,
  },
  card4: {
    minHeight: 230,
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
    fontSize: 28,
    lineHeight: 0.98,
    letterSpacing: "-0.04em",
  },
  cardText: {
    margin: 0,
    fontSize: 16,
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
    fontSize: "clamp(34px, 4vw, 60px)",
    lineHeight: 0.94,
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
