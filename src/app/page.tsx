import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { TopNav } from "@/components/top-nav";
import { EVENT_TYPES } from "@/lib/constants";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <LandingHero />
      <section className="section">
        <div className="container">
          <div className="grid" style={styles.typesHead}>
            <span className="eyebrow">10 tipos de evento listos</span>
            <h2 className="serif" style={styles.h2}>
              Plantillas de landing que puedes personalizar por evento
            </h2>
            <p className="muted" style={styles.lead}>
              Cada tipo de evento trae una estructura base distinta, pero luego puedes editar colores,
              textos, orden de secciones, CTA, moderación y límite de peso de fotos.
            </p>
          </div>
          <div style={styles.cards}>
            {EVENT_TYPES.map((item) => (
              <article key={item.key} className="card glass" style={styles.card}>
                <div style={{ ...styles.swatch, background: item.accent }} />
                <strong>{item.name}</strong>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
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
            <div>
              <span className="eyebrow">Demostración</span>
              <h3 className="serif" style={styles.h3}>
                Evento de ejemplo con landing en vivo y galería destacada
              </h3>
              <p className="muted" style={styles.lead}>
                El QR puede llevar a una URL personalizada como <code>/event/tu-evento</code>. Desde ahí los
                invitados toman o suben fotos, aplican filtros, agregan nombre o permanecen anónimos y
                las fotos aparecen al instante.
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
  typesHead: {
    maxWidth: 720,
    marginBottom: 26,
  },
  h2: {
    fontSize: "clamp(36px, 4vw, 54px)",
    lineHeight: 0.95,
    margin: 0,
  },
  lead: {
    fontSize: 18,
    lineHeight: 1.7,
    margin: 0,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 24,
    display: "grid",
    gap: 14,
    minHeight: 180,
  },
  swatch: {
    width: 44,
    height: 10,
    borderRadius: 999,
  },
  demo: {
    padding: 26,
    borderRadius: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
  },
  h3: {
    fontSize: "clamp(28px, 3vw, 42px)",
    lineHeight: 1,
    margin: "12px 0 16px",
  },
  demoActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
};
