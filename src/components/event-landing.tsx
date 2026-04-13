"use client";

import { useState } from "react";
import type { EventRecord, PhotoRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { PhotoComposer } from "@/components/photo-composer";
import { RealtimeGallery } from "@/components/realtime-gallery";

/** Returns true if hex color is too dark to use as button background on a dark landing */
function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 80;
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
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
  const [livePhotos, setLivePhotos] = useState<PhotoRecord[]>([]);

  const theme = event.landing_config.theme;
  const sections = event.landing_config.sections;
  const coverUrl = theme.heroImage ?? event.cover_image_url ?? "";
  const hasGallery = sections.includes("gallery");
  const accentDark = isDark(theme.accent);
  const accentColor = accentDark ? "#ffffff" : theme.accent;
  const accentTextColor = accentDark ? "#060a18" : "#ffffff";

  // Show gallery only when there are photos
  const hasPhotos = initialPhotos.length > 0 || livePhotos.length > 0;

  return (
    <main
      className="dark-theme"
      style={{ background: `linear-gradient(180deg, ${theme.background} 0%, #050816 100%)`, color: "#f0ede8", minHeight: "100vh" }}
    >
      {/* ── HERO — full screen, upload buttons embedded ─────────────── */}
      <section style={s.heroSection}>
        {/* Background */}
        {coverUrl ? (
          <div style={{
            ...s.heroBg,
            backgroundImage: `linear-gradient(180deg, rgba(5,8,22,0.18) 0%, rgba(5,8,22,0.65) 50%, rgba(5,8,22,0.97) 100%), url(${coverUrl})`,
          }} />
        ) : (
          <div style={{ ...s.heroBg, background: `radial-gradient(ellipse at 50% 20%, ${theme.accent}28 0%, transparent 65%)` }} />
        )}

        <div className="container" style={s.heroInner}>
          {/* Event badge */}
          <div style={s.heroTop}>
            <span style={{
              ...s.badge,
              background: `${theme.accent}22`,
              border: `1px solid ${theme.accent}55`,
              color: accentDark ? "rgba(255,255,255,0.7)" : theme.accent,
            }}>
              {event.event_type_key.replaceAll("-", " ")}
            </span>
          </div>

          {/* Title block */}
          <div style={s.heroCopy}>
            <h1 style={s.heroTitle}>
              {event.landing_config.heroTitle}
            </h1>

            {event.landing_config.heroSubtitle ? (
              <p style={s.heroSubtitle}>{event.landing_config.heroSubtitle}</p>
            ) : null}

            {/* Date / venue chips */}
            {(event.event_date || event.venue_name) ? (
              <div style={s.metaRow}>
                {event.event_date ? (
                  <span style={s.metaChip}>
                    <CalendarIcon />
                    {formatDate(event.event_date)}
                  </span>
                ) : null}
                {event.venue_name ? (
                  <span style={s.metaChip}>
                    <PinIcon />
                    {event.venue_name}{event.venue_city ? `, ${event.venue_city}` : ""}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* ── Action area — upload buttons live here ── */}
          <div style={s.heroActions}>
            <p style={s.uploadPrompt}>
              Comparte tu foto y aparecerá aquí en segundos
            </p>
            <PhotoComposer
              event={event}
              compact
              accentColor={accentColor}
              onUploaded={(photo) => {
                if (photo.moderation_status === "approved") {
                  setLivePhotos((prev) => [photo, ...prev]);
                }
              }}
            />
            {hasGallery && hasPhotos ? (
              <a style={s.scrollDown} href="#gallery">
                Ver fotos del evento ↓
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── GALLERY — only when there are photos ─────────────────────── */}
      {hasGallery && hasPhotos ? (
        <RealtimeGallery
          event={event}
          initialPhotos={initialPhotos}
          additionalPhotos={livePhotos}
        />
      ) : null}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  heroSection: {
    position: "relative",
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: 0,
  },
  heroInner: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    paddingTop: "max(64px, env(safe-area-inset-top, 64px))",
    paddingBottom: 48,
    gap: 0,
    minHeight: "100svh",
  },
  heroTop: {
    paddingBottom: 20,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    width: "fit-content",
  },
  heroCopy: {
    display: "grid",
    gap: 16,
    flex: 1,
    justifyContent: "start",
    alignContent: "center",
  },
  heroTitle: {
    fontSize: "clamp(40px, 10vw, 88px)",
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.04em",
    color: "#ffffff",
    fontWeight: 800,
  },
  heroSubtitle: {
    fontSize: "clamp(15px, 2vw, 19px)",
    lineHeight: 1.65,
    margin: 0,
    color: "rgba(255,255,255,0.6)",
    maxWidth: 520,
  },
  metaRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    paddingTop: 4,
  },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.7)",
  },
  heroActions: {
    display: "grid",
    gap: 14,
    paddingTop: 32,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    marginTop: 20,
  },
  uploadPrompt: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  scrollDown: {
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "8px 0",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    textDecoration: "none",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
};
