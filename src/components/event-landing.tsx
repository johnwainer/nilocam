"use client";

import { useEffect, useState } from "react";
import type { EventRecord, PhotoRecord } from "@/types";
import { formatDate, publicStorageUrl } from "@/lib/utils";
import { PhotoComposer } from "@/components/photo-composer";
import { RealtimeGallery } from "@/components/realtime-gallery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

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

  // Always-on realtime subscription — runs even when the gallery section is
  // hidden (0 initial photos) so the first approved photo makes it appear.
  // Handles both auto-moderation (INSERT as approved) and manual moderation
  // (INSERT as pending → UPDATE to approved by admin).
  useEffect(() => {
    const addIfApproved = (row: PhotoRecord) => {
      if (row.moderation_status !== "approved") return;
      const withUrl: PhotoRecord = row.public_url
        ? row
        : { ...row, public_url: publicStorageUrl(row.storage_path) };
      setLivePhotos((prev) => {
        if (prev.some((p) => p.id === withUrl.id)) return prev;
        return [withUrl, ...prev];
      });
    };

    const channel = supabase
      .channel(`landing-live-${event.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => addIfApproved(payload.new as PhotoRecord)
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => addIfApproved(payload.new as PhotoRecord)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  const cfg = event.landing_config;
  const theme = cfg.theme;
  const sections = cfg.sections;
  const coverUrl = theme.heroImage ?? event.cover_image_url ?? "";

  // Derived flags
  const showCtas       = sections.includes("ctas");
  const showHowItWorks = sections.includes("how-it-works");
  const showGallery    = sections.includes("gallery");
  const showEventInfo  = sections.includes("event-info");
  const showPrivacy    = sections.includes("privacy");
  const showSupport    = sections.includes("support");

  const hasPhotos     = initialPhotos.length > 0 || livePhotos.length > 0;
  const darkPage      = isDark(theme.background);
  const accentIsDark  = isDark(theme.accent);
  const accentColor   = accentIsDark ? "#ffffff" : theme.accent;

  // Text helpers based on page brightness
  const textPrimary   = theme.text;
  const textMuted     = theme.muted;
  const borderColor   = theme.border;

  return (
    <main
      className={darkPage ? "dark-theme" : ""}
      style={{ background: theme.background, color: textPrimary, minHeight: "100vh" }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section style={s.heroSection}>
        {coverUrl ? (
          <div style={{
            ...s.heroBg,
            backgroundImage: `linear-gradient(180deg, rgba(5,8,22,0.18) 0%, rgba(5,8,22,0.65) 55%, ${theme.background} 100%), url(${coverUrl})`,
          }} />
        ) : (
          <div style={{
            ...s.heroBg,
            background: `radial-gradient(ellipse at 50% 20%, ${theme.accent}30 0%, transparent 65%), ${theme.background}`,
          }} />
        )}

        <div className="container" style={s.heroInner}>
          {/* Event type badge */}
          <div style={s.heroTop}>
            <span style={{
              ...s.badge,
              background: `${theme.accent}22`,
              border: `1px solid ${theme.accent}55`,
              color: accentIsDark ? "rgba(255,255,255,0.75)" : theme.accent,
            }}>
              {event.event_type_key.replaceAll("-", " ")}
            </span>
          </div>

          {/* Title + subtitle */}
          <div style={s.heroCopy}>
            <h1 style={s.heroTitle}>{cfg.heroTitle}</h1>
            {cfg.heroSubtitle && (
              <p style={s.heroSubtitle}>{cfg.heroSubtitle}</p>
            )}
            {(event.event_date || event.venue_name) && (
              <div style={s.metaRow}>
                {event.event_date && (
                  <span style={s.metaChip}>
                    <CalendarIcon />{formatDate(event.event_date)}
                  </span>
                )}
                {event.venue_name && (
                  <span style={s.metaChip}>
                    <PinIcon />{event.venue_name}{event.venue_city ? `, ${event.venue_city}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── CTAs — upload buttons ── */}
          {showCtas && event.allow_guest_upload && event.is_active && (
            <div style={s.heroActions}>
              <p style={s.uploadPrompt}>Comparte tu foto y aparecerá aquí en segundos</p>
              <PhotoComposer
                event={event}
                compact
                accentColor={accentColor}
                onUploaded={(photo) => {
                  if (photo.moderation_status === "approved") {
                    setLivePhotos((prev) => [photo, ...prev]);
                  }
                  // Give React one frame to render the gallery section (first photo case)
                  setTimeout(() => {
                    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 350);
                }}
              />
              {showGallery && hasPhotos && (
                <a style={s.scrollDown} href="#gallery">Ver fotos del evento ↓</a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────────── */}
      {showHowItWorks && (
        <section style={{ background: theme.surface, padding: "64px 0" }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <span style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: textMuted,
                marginBottom: 12,
              }}>
                Cómo funciona
              </span>
              <h2 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 700, margin: 0, letterSpacing: "-0.03em", color: textPrimary }}>
                Participa en segundos
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { n: "01", title: "Escanea el QR", desc: "Apunta la cámara al código del evento, no necesitas instalar nada." },
                { n: "02", title: "Toma o sube", desc: "Captura el momento o elige una foto de tu galería. Aplica filtros si quieres." },
                { n: "03", title: "Aparece en vivo", desc: "Tu foto llega a la pantalla del evento en segundos, visible para todos." },
              ].map((step) => (
                <div key={step.n} style={{
                  padding: 28,
                  borderRadius: 20,
                  background: theme.surfaceSoft,
                  border: `1px solid ${borderColor}`,
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: accentColor,
                    marginBottom: 14,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {step.n}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: textPrimary, letterSpacing: "-0.02em" }}>
                    {step.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: textMuted }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY — always dark regardless of theme ─────────────────── */}
      {showGallery && hasPhotos && (
        <div style={{ background: "#050816" }}>
          <RealtimeGallery
            event={event}
            initialPhotos={initialPhotos}
            additionalPhotos={livePhotos}
            mode={cfg.galleryMode ?? "grid"}
          />
        </div>
      )}

      {/* ── DATOS DEL EVENTO ──────────────────────────────────────────── */}
      {showEventInfo && (event.event_date || event.venue_name || event.subtitle) && (
        <section style={{ background: theme.surface, padding: "52px 0" }}>
          <div className="container">
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: textMuted,
                  marginBottom: 10,
                }}>
                  Detalles del evento
                </span>
                <h2 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 700, margin: 0, letterSpacing: "-0.025em", color: textPrimary }}>
                  {event.title}
                </h2>
                {event.subtitle && (
                  <p style={{ margin: "8px 0 0", fontSize: 15, color: textMuted, lineHeight: 1.6 }}>
                    {event.subtitle}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {event.event_date && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 18px",
                    borderRadius: 999,
                    background: theme.surfaceSoft,
                    border: `1px solid ${borderColor}`,
                    fontSize: 14,
                    fontWeight: 600,
                    color: textPrimary,
                  }}>
                    <CalendarIcon />
                    {formatDate(event.event_date)}
                  </div>
                )}
                {event.venue_name && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 18px",
                    borderRadius: 999,
                    background: theme.surfaceSoft,
                    border: `1px solid ${borderColor}`,
                    fontSize: 14,
                    fontWeight: 600,
                    color: textPrimary,
                  }}>
                    <PinIcon />
                    {event.venue_name}{event.venue_city ? `, ${event.venue_city}` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PRIVACIDAD ────────────────────────────────────────────────── */}
      {showPrivacy && cfg.privacyCopy && (
        <section style={{ padding: "36px 0", borderTop: `1px solid ${borderColor}` }}>
          <div className="container">
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: textMuted, maxWidth: 640 }}>
              {cfg.privacyCopy}
            </p>
          </div>
        </section>
      )}

      {/* ── SOPORTE ───────────────────────────────────────────────────── */}
      {showSupport && (
        <section style={{ padding: "32px 0", borderTop: `1px solid ${borderColor}` }}>
          <div className="container">
            <p style={{ margin: 0, fontSize: 12, color: textMuted, opacity: 0.6 }}>
              Powered by <strong>Memorica</strong> · ¿Necesitas ayuda?{" "}
              <a href="mailto:hola@memorica.app" style={{ color: textMuted }}>hola@memorica.app</a>
            </p>
          </div>
        </section>
      )}
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
    minHeight: "100svh",
  },
  heroTop: { paddingBottom: 20 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
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
  metaRow: { display: "flex", gap: 8, flexWrap: "wrap" as const, paddingTop: 4 },
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
  },
};
