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

  return (
    <main
      style={
        {
          background: `radial-gradient(circle at top, ${theme.accentSoft}33, transparent 30%), linear-gradient(180deg, ${theme.background}, #050816 82%)`,
          color: theme.text,
          minHeight: "100vh",
        } as React.CSSProperties
      }
    >
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="card glass" style={styles.hero}>
            <div style={styles.heroCopy}>
              <span className="pill" style={{ color: theme.text, background: "rgba(255,255,255,0.05)" }}>
                {event.event_type_key.replaceAll("-", " ")}
              </span>
              <p className="eyebrow" style={{ color: theme.accent }}>
                {event.landing_config.heroEyebrow}
              </p>
              <h1 className="serif" style={{ ...styles.heroTitle, color: theme.text }}>
                {event.landing_config.heroTitle}
              </h1>
              <p style={{ ...styles.heroSubtitle, color: theme.muted }}>{event.landing_config.heroSubtitle}</p>
              {sections.includes("ctas") ? (
                <div style={styles.ctaRow}>
                  <a className="btn btn-primary" href="#uploader">
                    {event.landing_config.primaryCta}
                  </a>
                  <a className="btn btn-secondary" href="#gallery">
                    {event.landing_config.tertiaryCta}
                  </a>
                </div>
              ) : null}
              <div style={styles.metaGrid}>
                <div className="card glass" style={styles.metaCard}>
                  <span className="muted">Evento</span>
                  <strong>{event.title}</strong>
                </div>
                <div className="card glass" style={styles.metaCard}>
                  <span className="muted">Fecha</span>
                  <strong>{formatDate(event.event_date)}</strong>
                </div>
                <div className="card glass" style={styles.metaCard}>
                  <span className="muted">Moderación</span>
                  <strong>{event.moderation_mode === "auto" ? "Automática" : "Manual"}</strong>
                </div>
              </div>
            </div>
            <div style={styles.heroVisual}>
              <div
                className="card"
                style={{
                  ...styles.heroPoster,
                  backgroundImage: `linear-gradient(180deg, rgba(6,9,19,0.1), rgba(6,9,19,0.9)), url(${theme.heroImage ?? event.cover_image_url ?? ""})`,
                }}
              >
                <div style={styles.posterBadge}>Nilo Cam</div>
                <div style={styles.posterBottom}>
                  <strong>{event.venue_name || "Landing personalizable"}</strong>
                  <span>{event.venue_city || "Fotos en vivo desde el QR"}</span>
                </div>
              </div>
              <div className="card glass" style={styles.highlightCard}>
                <div className="pulse-dot" />
                <strong>{event.landing_config.highlightCopy}</strong>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                  {event.landing_config.introCopy}
                </p>
              </div>
              <div style={styles.bigStrip}>
                <div style={styles.bigStripImage} />
                <div style={styles.bigStripText}>
                  <span className="eyebrow">Slide destacado</span>
                  <h2 className="serif" style={styles.bigStripTitle}>
                    Mucho más visual, mucho más limpio
                  </h2>
                </div>
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

      {sections.includes("gallery") ? <RealtimeGallery event={event} initialPhotos={initialPhotos} /> : null}

      {sections.includes("how-it-works") || sections.includes("privacy") || sections.includes("event-info") ? (
        <section className="section">
          <div className="container">
            <div style={styles.infoGrid}>
              {sections.includes("how-it-works") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Cómo funciona</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Escanea, toma o sube, y listo
                  </h3>
                  <p className="muted" style={styles.infoText}>
                    No hay registro obligatorio. Si el evento lo permite, el invitado puede dejar su nombre o
                    subir como anónimo. Todo queda asociado al evento.
                  </p>
                </article>
              ) : null}
              {sections.includes("privacy") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Privacidad</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Moderación y términos
                  </h3>
                  <p className="muted" style={styles.infoText}>
                    {event.landing_config.privacyCopy}
                  </p>
                </article>
              ) : null}
              {sections.includes("event-info") ? (
                <article className="card glass" style={styles.infoCard}>
                  <span className="eyebrow">Límite</span>
                  <h3 className="serif" style={styles.infoTitle}>
                    Peso máximo configurable
                  </h3>
                  <p className="muted" style={styles.infoText}>
                    Este evento acepta hasta {event.max_upload_mb} MB por foto. El admin puede cambiarlo cuando
                    quiera.
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
  hero: {
    padding: 24,
    borderRadius: 32,
    display: "grid",
    gap: 24,
    gridTemplateColumns: "1.02fr 0.98fr",
    overflow: "hidden",
  },
  heroCopy: {
    display: "grid",
    gap: 16,
    alignContent: "start",
    paddingRight: 6,
  },
  heroTitle: {
    fontSize: "clamp(44px, 6vw, 82px)",
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.04em",
  },
  heroSubtitle: {
    fontSize: 18,
    lineHeight: 1.8,
    margin: 0,
    maxWidth: 640,
  },
  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  metaGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    marginTop: 8,
  },
  metaCard: {
    padding: 16,
    borderRadius: 22,
    display: "grid",
    gap: 8,
  },
  heroVisual: {
    display: "grid",
    gap: 14,
  },
  heroPoster: {
    minHeight: 560,
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
  bigStrip: {
    minHeight: 240,
    borderRadius: 28,
    overflow: "hidden",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
  },
  bigStripImage: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.85)), url(https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "grayscale(1) brightness(0.6) contrast(1.15)",
  },
  bigStripText: {
    padding: 22,
    display: "grid",
    alignContent: "end",
    gap: 10,
  },
  bigStripTitle: {
    margin: 0,
    fontSize: "clamp(26px, 2.8vw, 40px)",
    lineHeight: 0.98,
    letterSpacing: "-0.04em",
  },
  infoGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  infoCard: {
    padding: 22,
    borderRadius: 26,
    display: "grid",
    gap: 12,
  },
  infoTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1,
  },
  infoText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.75,
  },
};
