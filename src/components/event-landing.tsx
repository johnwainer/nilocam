"use client";

import type { EventRecord, PhotoRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { PhotoComposer } from "@/components/photo-composer";
import { RealtimeGallery } from "@/components/realtime-gallery";

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function EventLanding({
  event,
  initialPhotos,
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
}) {
  const theme = event.landing_config.theme;
  const sections = event.landing_config.sections;
  const coverUrl = theme.heroImage ?? event.cover_image_url ?? "";
  const hasGallery = sections.includes("gallery");

  return (
    <main
      className="dark-theme"
      style={{ background: `linear-gradient(180deg, ${theme.background} 0%, #050816 100%)`, color: "#f0ede8", minHeight: "100vh" }}
    >
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={styles.heroSection}>
        {/* Full-bleed cover image with gradient overlay (visible on mobile too) */}
        {coverUrl ? (
          <div
            style={{
              ...styles.heroBg,
              backgroundImage: `linear-gradient(180deg, rgba(5,8,22,0.25) 0%, rgba(5,8,22,0.78) 55%, rgba(5,8,22,1) 100%), url(${coverUrl})`,
            }}
          />
        ) : (
          <div style={{ ...styles.heroBg, background: `radial-gradient(ellipse at top, ${theme.accentSoft}44 0%, transparent 60%)` }} />
        )}

        <div className="container el-hero-content" style={styles.heroContent}>
          {/* ── left / main copy ── */}
          <div style={styles.heroCopy}>
            <span style={styles.eventTypeBadge}>
              {event.event_type_key.replaceAll("-", " ")}
            </span>

            <h1 style={styles.heroTitle}>
              {event.landing_config.heroTitle}
            </h1>

            {event.landing_config.heroSubtitle ? (
              <p style={styles.heroSubtitle}>{event.landing_config.heroSubtitle}</p>
            ) : null}

            <div style={styles.metaRow}>
              {event.event_date ? (
                <span style={styles.metaChip}>
                  <CalendarIcon />
                  {formatDate(event.event_date)}
                </span>
              ) : null}
              {event.venue_name ? (
                <span style={styles.metaChip}>
                  <PinIcon />
                  {event.venue_name}
                  {event.venue_city ? `, ${event.venue_city}` : ""}
                </span>
              ) : null}
            </div>

            <div style={styles.ctaRow}>
              <a style={styles.ctaPrimary} href="#uploader">
                {event.landing_config.primaryCta ?? "Subir mi foto"}
              </a>
              {hasGallery ? (
                <a style={styles.ctaGhost} href="#gallery">
                  Ver galería
                </a>
              ) : null}
            </div>
          </div>

          {/* ── right: cover image card (desktop only) ── */}
          {coverUrl ? (
            <div
              className="el-hero-visual"
              style={{
                ...styles.heroImageCard,
                backgroundImage: `url(${coverUrl})`,
              }}
            />
          ) : null}
        </div>
      </section>

      {/* ── UPLOADER ─────────────────────────────────────────────────── */}
      <section id="uploader" style={styles.section}>
        <div className="container">
          <PhotoComposer event={event} />
        </div>
      </section>

      {/* ── GALLERY ──────────────────────────────────────────────────── */}
      {hasGallery ? (
        <RealtimeGallery event={event} initialPhotos={initialPhotos} />
      ) : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heroSection: {
    position: "relative",
    minHeight: "100svh",
    display: "flex",
    alignItems: "flex-end",
    paddingBottom: 0,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: 0,
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 32,
    paddingTop: 80,
    paddingBottom: 56,
    alignItems: "end",
  },
  heroCopy: {
    display: "grid",
    gap: 20,
    alignContent: "end",
  },
  eventTypeBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "rgba(255,255,255,0.75)",
    width: "fit-content",
  },
  heroTitle: {
    fontSize: "clamp(42px, 10vw, 96px)",
    lineHeight: 0.9,
    margin: 0,
    letterSpacing: "-0.04em",
    color: "#ffffff",
    fontWeight: 700,
  },
  heroSubtitle: {
    fontSize: "clamp(16px, 2.2vw, 20px)",
    lineHeight: 1.65,
    margin: 0,
    color: "rgba(255,255,255,0.65)",
    maxWidth: 560,
  },
  metaRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.8)",
  },
  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    paddingTop: 4,
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    padding: "0 32px",
    borderRadius: 999,
    background: "#ffffff",
    color: "#060a18",
    fontWeight: 700,
    fontSize: 17,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  },
  ctaGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    padding: "0 28px",
    borderRadius: 999,
    background: "transparent",
    border: "1.5px solid rgba(255,255,255,0.28)",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
    fontSize: 16,
    cursor: "pointer",
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  },
  heroImageCard: {
    borderRadius: 28,
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: 520,
    filter: "grayscale(0.2) contrast(1.05)",
  },
  section: {
    padding: "64px 0",
  },
};
