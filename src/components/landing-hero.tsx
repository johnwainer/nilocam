import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function LandingHero() {
  return (
    <section className="section">
      <div className="container" style={styles.wrap}>
        <div style={styles.copy}>
          <span className="pill">Hecho para iPhone, Android y PWA</span>
          <h1 className="serif" style={styles.title}>
            Cada QR abre una experiencia viva de fotos para tu evento
          </h1>
          <p className="muted" style={styles.lead}>
            {APP_NAME} convierte bodas, quince años, cumpleaños y eventos corporativos en una landing
            personalizada donde los invitados toman o suben fotos y las ven aparecer en tiempo real.
          </p>
          <div style={styles.actions}>
            <Link href="/admin" className="btn btn-primary">
              Crear evento
            </Link>
            <Link href="/event/demo-nilo-cam" className="btn btn-secondary">
              Abrir demo
            </Link>
          </div>
          <div style={styles.grid}>
            <div className="card glass" style={styles.stat}>
              <strong>Sin instalar nada</strong>
              <span className="muted">PWA optimizada para móvil y desktop</span>
            </div>
            <div className="card glass" style={styles.stat}>
              <strong>Moderación por evento</strong>
              <span className="muted">Automático o revisado por admin/owner</span>
            </div>
            <div className="card glass" style={styles.stat}>
              <strong>Editor visual</strong>
              <span className="muted">Landing editable por tipo de evento</span>
            </div>
          </div>
        </div>
        <div className="card glass" style={styles.preview}>
          <div style={styles.previewTop}>
            <span className="pulse-dot" />
            <span>Fotos llegando en tiempo real</span>
          </div>
          <div style={styles.phone}>
            <div style={styles.phoneScreen}>
              <div style={styles.previewBadge}>Nilo Cam</div>
              <div className="serif" style={styles.phoneTitle}>
                Escanea el QR y comparte tu mejor foto
              </div>
              <div style={styles.previewGrid}>
                {["/api/placeholder/1", "/api/placeholder/2", "/api/placeholder/3"].map((item, index) => (
                  <div key={item} style={{ ...styles.previewTile, opacity: 0.76 + index * 0.08 }} />
                ))}
              </div>
              <div style={styles.phoneCtas}>
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
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 28,
    gridTemplateColumns: "1.1fr 0.9fr",
    alignItems: "center",
  },
  copy: {
    display: "grid",
    gap: 18,
    maxWidth: 700,
  },
  title: {
    fontSize: "clamp(52px, 6vw, 84px)",
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.03em",
  },
  lead: {
    fontSize: "clamp(17px, 1.55vw, 20px)",
    lineHeight: 1.7,
    maxWidth: 620,
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    marginTop: 10,
  },
  stat: {
    padding: 18,
    borderRadius: 22,
    display: "grid",
    gap: 8,
    minHeight: 112,
  },
  preview: {
    padding: 18,
    borderRadius: 34,
    overflow: "hidden",
  },
  previewTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "var(--muted)",
    fontSize: 14,
    marginBottom: 14,
  },
  phone: {
    borderRadius: 30,
    padding: 14,
    background: "linear-gradient(180deg, #1c243a, #0a0f1d)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  phoneScreen: {
    borderRadius: 24,
    padding: 18,
    minHeight: 640,
    background:
      "radial-gradient(circle at top, rgba(212,163,115,0.22), transparent 26%), linear-gradient(180deg, #11182b, #0a0f19 72%)",
    display: "grid",
    gap: 18,
  },
  previewBadge: {
    alignSelf: "start",
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    width: "fit-content",
  },
  phoneTitle: {
    fontSize: 42,
    lineHeight: 0.98,
    margin: 0,
  },
  previewGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  previewTile: {
    aspectRatio: "3 / 4",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)), url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=500&q=80)",
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  phoneCtas: {
    display: "grid",
    gap: 10,
    marginTop: "auto",
  },
};
