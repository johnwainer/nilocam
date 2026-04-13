"use client";

import type { EventRecord, PhotoRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { PhotoComposer } from "@/components/photo-composer";
import { RealtimeGallery } from "@/components/realtime-gallery";

export function EventLanding({
  event,
  initialPhotos,
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
}) {
  const theme = event.landing_config.theme;
  const sections = event.landing_config.sections;
  const quickSteps = [
    {
      step: "1",
      title: "Escanea el QR",
      text: "En un segundo estás dentro del evento. Sin apps, sin registros, sin fricción.",
    },
    {
      step: "2",
      title: "Captura el momento",
      text: "Usa la cámara directamente o sube una foto ya tomada. Tan fácil como debería ser.",
    },
    {
      step: "3",
      title: "Aparece en pantalla",
      text: "Tu foto se suma a la galería del evento en tiempo real, visible para todos.",
    },
  ];

  return (
    <main
      className="dark-theme"
      style={
        {
          background: `radial-gradient(circle at top, ${theme.accentSoft}33, transparent 30%), linear-gradient(180deg, ${theme.background}, #050816 82%)`,
          color: "#f0ede8",
          minHeight: "100vh",
        } as React.CSSProperties
      }
    >
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="card glass el-hero">
            {/* ── Copy column ── */}
            <div style={styles.heroCopy}>
              <span className="pill">
                {event.event_type_key.replaceAll("-", " ")}
              </span>
              <p className="eyebrow">
                {event.landing_config.heroEyebrow}
              </p>
              <h1 className="serif" style={{ ...styles.heroTitle, color: "#ffffff" }}>
                {event.landing_config.heroTitle}
              </h1>
              <p style={{ ...styles.heroSubtitle, color: "rgba(255,255,255,0.7)" }}>
                {event.landing_config.heroSubtitle}
              </p>

              {sections.includes("ctas") ? (
                <div style={styles.ctaRow}>
                  <a style={styles.ctaPrimary} href="#uploader">
                    {event.landing_config.primaryCta}
                  </a>
                  <a style={styles.ctaSecondary} href="#gallery">
                    {event.landing_config.tertiaryCta}
                  </a>
                </div>
              ) : null}

              {sections.includes("how-it-works") ? (
                <div style={styles.quickGrid}>
                  {quickSteps.map((item) => (
                    <article key={item.step} className="card glass" style={styles.quickCard}>
                      <span className="pill" style={styles.quickBadge}>
                        {item.step}
                      </span>
                      <strong style={styles.quickTitle}>{item.title}</strong>
                      <p style={styles.quickText}>{item.text}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              <div style={styles.metaGrid}>
                <div className="card glass" style={styles.metaCard}>
                  <span style={styles.metaMuted}>Evento</span>
                  <strong style={{ color: "#fff" }}>{event.title}</strong>
                </div>
                <div className="card glass" style={styles.metaCard}>
                  <span style={styles.metaMuted}>Fecha</span>
                  <strong style={{ color: "#fff" }}>{formatDate(event.event_date)}</strong>
                </div>
                <div className="card glass" style={styles.metaCard}>
                  <span style={styles.metaMuted}>Moderación</span>
                  <strong style={{ color: "#fff" }}>
                    {event.moderation_mode === "auto" ? "Instantánea" : "Por aprobación"}
                  </strong>
                </div>
              </div>
            </div>

            {/* ── Visual column (hidden on mobile via CSS) ── */}
            <div className="el-hero-visual" style={styles.heroVisual}>
              <div
                className="card"
                style={{
                  ...styles.heroPoster,
                  backgroundImage: `linear-gradient(180deg, rgba(6,9,19,0.1), rgba(6,9,19,0.9)), url(${theme.heroImage ?? event.cover_image_url ?? ""})`,
                }}
              >
                <div style={styles.posterBadge}>Nilo Cam</div>
                <div style={styles.posterBottom}>
                  <strong style={{ color: "#fff" }}>{event.venue_name || "Landing personalizable"}</strong>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    {event.venue_city || "Fotos en vivo desde el QR"}
                  </span>
                </div>
              </div>
              <div className="card glass" style={styles.highlightCard}>
                <div className="pulse-dot" />
                <strong style={{ color: "#fff" }}>{event.landing_config.highlightCopy}</strong>
                <p style={{ ...styles.highlightText }}>{event.landing_config.introCopy}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="uploader">
        <div className="container">
          <PhotoComposer event={event} />
        </div>
      </section>

      {sections.includes("gallery") ? (
        <RealtimeGallery event={event} initialPhotos={initialPhotos} />
      ) : null}

      {sections.includes("how-it-works") ||
      sections.includes("privacy") ||
      sections.includes("event-info") ? (
        <section className="section">
          <div className="container">
            <div className="el-info-grid">
              {sections.includes("how-it-works") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Sin fricción</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Nadie necesita instrucciones.
                  </h3>
                  <p style={styles.infoText}>
                    Sin registro obligatorio. Puedes firmar tu foto con tu nombre o subir de forma
                    anónima. La experiencia está diseñada para que todo fluya.
                  </p>
                </article>
              ) : null}
              {sections.includes("privacy") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Tu control, tus reglas.</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Moderación pensada para el organizador.
                  </h3>
                  <p style={styles.infoText}>{event.landing_config.privacyCopy}</p>
                </article>
              ) : null}
              {sections.includes("event-info") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Ligero por diseño.</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Rápido de subir, fácil de ver.
                  </h3>
                  <p style={styles.infoText}>
                    Este evento acepta fotos de hasta {event.max_upload_mb} MB. Un límite pensado
                    para que la galería cargue rápido en cualquier conexión.
                  </p>
                </article>
              ) : null}
              {sections.includes("support") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Siempre hay solución.</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Algo no funcionó. Sin problema.
                  </h3>
                  <p style={styles.infoText}>
                    Vuelve a escanear el QR o acércate al staff. La experiencia está pensada para
                    resolverse sola, sin manuales ni tutoriales.
                  </p>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heroCopy: {
    display: "grid",
    gap: 16,
    alignContent: "start",
  },
  heroTitle: {
    fontSize: "clamp(40px, 9vw, 82px)",
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.04em",
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 1.75,
    margin: 0,
    maxWidth: 640,
  },
  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    padding: "0 28px",
    borderRadius: 999,
    background: "#ffffff",
    color: "#0b0f19",
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    padding: "0 28px",
    borderRadius: 999,
    background: "transparent",
    border: "1.5px solid rgba(255,255,255,0.35)",
    color: "#ffffff",
    fontWeight: 500,
    fontSize: 16,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  },
  quickGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginTop: 4,
  },
  quickCard: {
    padding: 16,
    borderRadius: 22,
    display: "grid",
    gap: 10,
  },
  quickBadge: {
    width: "fit-content",
    color: "#fff",
    background: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  quickTitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.1,
    color: "#ffffff",
  },
  quickText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.65)",
  },
  metaGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    marginTop: 4,
  },
  metaCard: {
    padding: 14,
    borderRadius: 20,
    display: "grid",
    gap: 6,
  },
  metaMuted: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  heroVisual: {
    display: "grid",
    gap: 14,
  },
  heroPoster: {
    minHeight: 520,
    borderRadius: 28,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 18,
    overflow: "hidden",
    filter: "grayscale(1) contrast(1.15) brightness(0.55)",
  },
  posterBadge: {
    alignSelf: "flex-start",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: 13,
  },
  posterBottom: {
    display: "grid",
    gap: 4,
    fontSize: 18,
  },
  highlightCard: {
    padding: 20,
    borderRadius: 24,
    display: "grid",
    gap: 12,
  },
  highlightText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.65)",
  },
  infoCard: {
    padding: 22,
    borderRadius: 26,
    display: "grid",
    gap: 12,
  },
  infoTitle: {
    margin: 0,
    fontSize: "clamp(22px, 3.5vw, 30px)",
    lineHeight: 1.05,
    color: "#ffffff",
  },
  infoText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.75,
    color: "rgba(255,255,255,0.65)",
  },
};
