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
    <section className="section landing-hero-section" style={styles.section}>
      <div className="container landing-hero-wrap" style={styles.wrap}>
        <div className="landing-hero-copy" style={styles.copy}>
          <span className="pill">PWA · sin instalar nada · QR por evento</span>
          <h1 className="serif" style={styles.title}>
            Fotos para eventos con una estética blanca, negra y muy visual
          </h1>
          <p className="muted" style={styles.lead}>
            {APP_NAME} abre una experiencia moderna donde los invitados toman o suben fotos y las ven
            aparecer en tiempo real dentro de una landing personalizada.
          </p>
          <div className="landing-hero-actions" style={styles.actions}>
            <Link href="/auth" className="btn btn-primary">
              Entrar al panel
            </Link>
            <Link href="/event/demo-nilo-cam" className="btn btn-secondary">
              Abrir demo
            </Link>
          </div>

          <div className="landing-hero-stats" style={styles.statsRow}>
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

        <div className="landing-hero-visual" style={styles.visual}>
          <div className="card glass landing-hero-canvas" style={styles.heroCanvas}>
            <article className="card landing-hero-main" style={{ ...styles.heroMain, ...styles.heroMainBg }}>
              <div style={styles.slideKicker}>01</div>
              <h2 style={styles.heroMainTitle}>{slides[0].title}</h2>
              <p style={styles.heroMainText}>{slides[0].subtitle}</p>
            </article>

            <div className="landing-hero-side-stack" style={styles.sideStack}>
              <article className="card landing-hero-side" style={{ ...styles.sideSlide, ...styles.slide2Bg }}>
                <div style={styles.slideKicker}>02</div>
                <h2 style={styles.sideTitle}>{slides[1].title}</h2>
                <p style={styles.sideText}>{slides[1].subtitle}</p>
              </article>

              <article className="card landing-hero-side" style={{ ...styles.sideSlide, ...styles.slide3Bg }}>
                <div style={styles.slideKicker}>03</div>
                <h2 style={styles.sideTitle}>{slides[2].title}</h2>
                <p style={styles.sideText}>{slides[2].subtitle}</p>
              </article>
            </div>
          </div>

          <div className="card landing-hero-device" style={styles.device}>
            <div style={styles.deviceTop}>
              <span className="pulse-dot" />
              <span>Galería destacada en vivo</span>
            </div>
            <div className="landing-hero-device-grid" style={styles.deviceGrid}>
              {["A", "B", "C"].map((item) => (
                <div key={item} className="landing-hero-tile" style={styles.tile}>
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
  section: {
    paddingTop: 12,
    paddingBottom: 20,
    minHeight: "calc(100vh - 88px)",
    display: "flex",
    alignItems: "center",
  },
  wrap: {
    display: "grid",
    gap: 32,
    gridTemplateColumns: "minmax(0, 0.92fr) minmax(0, 1.08fr)",
    alignItems: "center",
  },
  copy: {
    display: "grid",
    gap: 18,
    maxWidth: 720,
  },
  title: {
    fontSize: "clamp(58px, 7vw, 108px)",
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
  heroCanvas: {
    padding: 16,
    borderRadius: 36,
    display: "grid",
    gap: 16,
    gridTemplateColumns: "1.3fr 0.7fr",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.88))",
  },
  heroMain: {
    minHeight: 640,
    borderRadius: 30,
    padding: 28,
    display: "grid",
    alignContent: "end",
    gap: 14,
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    position: "relative",
  },
  heroMainBg: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.9)), url(https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80)",
  },
  heroMainTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "clamp(42px, 4.8vw, 76px)",
    lineHeight: 0.94,
    letterSpacing: "-0.05em",
    maxWidth: 560,
  },
  heroMainText: {
    margin: 0,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 1.65,
    maxWidth: 470,
    fontSize: 18,
  },
  sideStack: {
    display: "grid",
    gap: 16,
  },
  sideSlide: {
    minHeight: 312,
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
  slide2Bg: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.9)), url(https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80)",
  },
  slide3Bg: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.9)), url(https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80)",
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
  sideTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "clamp(24px, 2.4vw, 36px)",
    lineHeight: 0.96,
    letterSpacing: "-0.04em",
    maxWidth: 380,
  },
  sideText: {
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.6,
    maxWidth: 360,
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
      "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.88)), url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "end",
    padding: 14,
    filter: "grayscale(1)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
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
