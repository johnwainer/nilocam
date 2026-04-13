import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const slides = [
  {
    title: "Una experiencia tipo Apple para eventos",
    subtitle: "Blanco y negro, brutalmente limpia y con foco en imágenes grandes.",
  },
  {
    title: "Cada QR abre un evento único",
    subtitle: "Landing editable, moderación por evento y fotos en tiempo real.",
  },
  {
    title: "Tomar o subir fotos sin fricción",
    subtitle: "PWA, iPhone, Android y una galería destacada en vivo.",
  },
];

export function LandingHero() {
  return (
    <section className="section" style={{ paddingTop: 12 }}>
      <div className="container" style={styles.wrap}>
        <div style={styles.copy}>
          <span className="pill">PWA · sin instalar nada · QR por evento</span>
          <h1 className="serif" style={styles.title}>
            Fotos para eventos con una estética blanca, negra y muy visual
          </h1>
          <p className="muted" style={styles.lead}>
            {APP_NAME} abre una experiencia moderna donde los invitados toman o suben fotos y las ven
            aparecer en tiempo real dentro de una landing personalizada.
          </p>
          <div style={styles.actions}>
            <Link href="/admin" className="btn btn-primary">
              Crear evento
            </Link>
            <Link href="/event/demo-nilo-cam" className="btn btn-secondary">
              Abrir demo
            </Link>
          </div>

          <div style={styles.statsRow}>
            <div className="card" style={styles.stat}>
              <strong>10 tipos</strong>
              <span className="muted">de evento listos</span>
            </div>
            <div className="card" style={styles.stat}>
              <strong>Realtime</strong>
              <span className="muted">fotos en vivo</span>
            </div>
            <div className="card" style={styles.stat}>
              <strong>Editor</strong>
              <span className="muted">visual y editable</span>
            </div>
          </div>
        </div>

        <div style={styles.visual}>
          <div className="card glass" style={styles.slideDeck}>
            {slides.map((slide, index) => (
              <article key={slide.title} className="card" style={{ ...styles.slide, ...styles[`slide${index + 1}`] }}>
                <div style={styles.slideKicker}>0{index + 1}</div>
                <h2 style={styles.slideTitle}>{slide.title}</h2>
                <p style={styles.slideText}>{slide.subtitle}</p>
              </article>
            ))}
          </div>
          <div className="card" style={styles.device}>
            <div style={styles.deviceTop}>
              <span className="pulse-dot" />
              <span>Galería destacada en vivo</span>
            </div>
            <div style={styles.deviceGrid}>
              {["A", "B", "C"].map((item) => (
                <div key={item} style={styles.tile}>
                  <div style={styles.tileLabel}>Evento</div>
                </div>
              ))}
            </div>
            <div style={styles.deviceCtas}>
              <button className="btn btn-primary" style={{ width: "100%" }}>
                Tomar foto
              </button>
              <button className="btn btn-secondary" style={{ width: "100%" }}>
                Subir foto
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 28,
    gridTemplateColumns: "minmax(0, 1.02fr) minmax(0, 0.98fr)",
    alignItems: "center",
  },
  copy: {
    display: "grid",
    gap: 18,
    maxWidth: 760,
  },
  title: {
    fontSize: "clamp(60px, 7vw, 112px)",
    lineHeight: 0.9,
    margin: 0,
    letterSpacing: "-0.05em",
  },
  lead: {
    fontSize: "clamp(18px, 1.5vw, 21px)",
    lineHeight: 1.7,
    maxWidth: 640,
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  statsRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    marginTop: 8,
  },
  stat: {
    padding: 18,
    borderRadius: 24,
    display: "grid",
    gap: 8,
    minHeight: 112,
  },
  visual: {
    display: "grid",
    gap: 16,
  },
  slideDeck: {
    padding: 16,
    borderRadius: 34,
    display: "grid",
    gap: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))",
  },
  slide: {
    minHeight: 170,
    borderRadius: 28,
    padding: 22,
    display: "grid",
    alignContent: "end",
    gap: 10,
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    position: "relative",
  },
  slide1: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.58)), url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80)",
  },
  slide2: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.58)), url(https://images.unsplash.com/photo-1523438097201-512ae7d59f0d?auto=format&fit=crop&w=1200&q=80)",
  },
  slide3: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.58)), url(https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80)",
  },
  slideKicker: {
    display: "inline-flex",
    width: "fit-content",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.16em",
  },
  slideTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "clamp(28px, 3vw, 44px)",
    lineHeight: 0.96,
    letterSpacing: "-0.04em",
    maxWidth: 480,
  },
  slideText: {
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.6,
    maxWidth: 420,
  },
  device: {
    padding: 20,
    borderRadius: 32,
    background: "rgba(255,255,255,0.92)",
    display: "grid",
    gap: 18,
  },
  deviceTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "var(--muted)",
    fontSize: 14,
  },
  deviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  tile: {
    aspectRatio: "3 / 4",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.15), rgba(0,0,0,0.52)), url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "end",
    padding: 14,
    filter: "grayscale(1)",
  },
  tileLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  deviceCtas: {
    display: "grid",
    gap: 10,
  },
};
