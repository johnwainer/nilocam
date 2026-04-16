import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const slides = [
  {
    title: "Tu evento tiene su propia pantalla.",
    subtitle:
      "Un QR abre una landing personalizada, lista para recibir fotos desde el primer segundo.",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Cada foto, vista por todos.",
    subtitle: "Lo que captura un invitado aparece en la galería al instante, sin esperar.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Funciona en cualquier teléfono.",
    subtitle: "iPhone, Android, cualquier browser moderno. Sin descargar nada, sin registrarse.",
    image:
      "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80",
  },
];

function BentoSlide({
  slide,
  index,
  className,
}: {
  slide: (typeof slides)[0];
  index: number;
  className?: string;
}) {
  return (
    <article className={`card lh-bento-slide${className ? ` ${className}` : ""}`}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${slide.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) brightness(0.34) contrast(1.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.88) 100%)",
        }}
      />
      <div style={s.slideInner}>
        <span style={s.kicker}>0{index + 1}</span>
        <h2 style={index === 0 ? s.mainTitle : s.sideTitle}>{slide.title}</h2>
        <p style={index === 0 ? s.mainText : s.sideText}>{slide.subtitle}</p>
      </div>
    </article>
  );
}

export function LandingHero() {
  return (
    <section className="section lh-section">
      <div className="container">
        {/* Centered headline block */}
        <div className="lh-copy">
          <span className="pill" style={{ margin: "0 auto", width: "fit-content" }}>
            Sin app · Sin registro · Solo el QR
          </span>
          <h1 className="serif" style={s.title}>
            La galería viva
            <br />
            de tu evento.
          </h1>
          <p className="muted" style={s.lead}>
            {APP_NAME} convierte un código QR en una experiencia inmersiva: los invitados
            capturan el momento y sus fotos aparecen en pantalla grande, en tiempo real,
            mientras todo sucede.
          </p>
          <div style={s.actions}>
            <Link href="/auth" className="btn btn-primary">
              Empezar gratis
            </Link>
            <Link href="/event/demo-nilo-cam" className="btn btn-secondary">
              Ver demo en vivo
            </Link>
          </div>
          <p style={s.freeNote}>
            Sin tarjeta de crédito · Créditos de bienvenida incluidos
          </p>
        </div>

        {/* Bento showcase */}
        <div className="lh-bento">
          <BentoSlide slide={slides[0]} index={0} className="lh-bento-main" />
          <BentoSlide slide={slides[1]} index={1} className="lh-bento-side" />
          <BentoSlide slide={slides[2]} index={2} className="lh-bento-side" />
        </div>

        {/* Stats strip */}
        <div className="lh-stats">
          <div style={s.statItem}>
            <strong style={s.statLabel}>Sin fricción</strong>
            <span className="muted" style={s.statSub}>
              el invitado entiende todo al instante
            </span>
          </div>
          <div className="lh-stat-div" />
          <div style={s.statItem}>
            <strong style={s.statLabel}>En vivo</strong>
            <span className="muted" style={s.statSub}>
              fotos que aparecen al segundo
            </span>
          </div>
          <div className="lh-stat-div" />
          <div style={s.statItem}>
            <strong style={s.statLabel}>Tu marca</strong>
            <span className="muted" style={s.statSub}>
              landing 100% personalizable
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  title: {
    fontSize: "clamp(38px, 10vw, 148px)",
    lineHeight: 0.88,
    margin: 0,
    letterSpacing: "-0.05em",
  },
  lead: {
    fontSize: "clamp(18px, 1.5vw, 21px)",
    lineHeight: 1.65,
    maxWidth: 580,
    margin: "0 auto",
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  freeNote: {
    fontSize: 13,
    color: "var(--muted)",
    margin: 0,
    textAlign: "center",
    opacity: 0.75,
  },
  slideInner: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: 28,
    gap: 10,
  },
  kicker: {
    display: "inline-flex",
    width: "fit-content",
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.16em",
  },
  mainTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "clamp(36px, 4vw, 68px)",
    lineHeight: 0.93,
    letterSpacing: "-0.05em",
    maxWidth: 520,
  },
  mainText: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.65,
    maxWidth: 460,
    fontSize: 17,
  },
  sideTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "clamp(22px, 2.2vw, 32px)",
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
    maxWidth: 340,
  },
  sideText: {
    margin: 0,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.6,
    fontSize: 15,
    maxWidth: 320,
  },
  statItem: {
    display: "grid",
    gap: 6,
    padding: "22px 32px",
  },
  statLabel: {
    fontSize: 18,
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },
  statSub: {
    fontSize: 14,
    lineHeight: 1.5,
  },
};
