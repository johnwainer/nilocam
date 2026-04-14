"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { EventRecord, PhotoRecord } from "@/types";
import { publicStorageUrl } from "@/lib/utils";

const supabase = createSupabaseBrowserClient();

const SPEEDS = [4, 6, 10, 15] as const;
type Speed = (typeof SPEEDS)[number];

// ── Main component ────────────────────────────────────────────────────────────

export function GalleryDisplay({
  event,
  initialPhotos,
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
}) {
  const [photos, setPhotos] = useState<PhotoRecord[]>(initialPhotos);
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transKey, setTransKey] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(6);
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep mutable refs so callbacks always see the latest values
  const photosRef = useRef(photos);
  const curRef = useRef(cur);
  // Sync refs after every render so async callbacks always see latest values
  useEffect(() => {
    photosRef.current = photos;
    curRef.current = cur;
  });


  // ── Prevent body scroll ──────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Realtime: new/approved photos join the rotation immediately ─────────
  useEffect(() => {
    const addPhoto = (row: PhotoRecord) => {
      if (row.moderation_status !== "approved") return;
      const withUrl = { ...row, public_url: publicStorageUrl(row.storage_path) };
      setPhotos((prev) => {
        if (prev.some((p) => p.id === withUrl.id)) return prev;
        // Insert right after current position so it appears on the next slide,
        // not after a full cycle of potentially many existing photos.
        const insertAt = curRef.current + 1;
        const next = [...prev];
        next.splice(insertAt, 0, withUrl);
        return next;
      });
    };

    const channel = supabase
      .channel(`display-${event.id}`)
      // New photo uploaded and already approved (auto-moderation)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => addPhoto(payload.new as PhotoRecord)
      )
      // Photo manually approved in admin (status UPDATE → "approved")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => addPhoto(payload.new as PhotoRecord)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const advanceTo = useCallback((to: number) => {
    setPrev(curRef.current);
    setCur(to);
    setTransKey((k) => k + 1);
  }, []);

  const goNext = useCallback(() => {
    const n = photosRef.current.length;
    if (n < 2) return;
    advanceTo((curRef.current + 1) % n);
  }, [advanceTo]);

  const goPrev = useCallback(() => {
    const n = photosRef.current.length;
    if (n < 2) return;
    advanceTo((curRef.current - 1 + n) % n);
  }, [advanceTo]);

  // ── Auto-advance ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const t = setInterval(goNext, speed * 1000);
    return () => clearInterval(t);
  }, [playing, speed, photos.length, goNext]);

  // ── Controls auto-hide ───────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setCtrlVisible(true);
    if (ctrlTimerRef.current) clearTimeout(ctrlTimerRef.current);
    ctrlTimerRef.current = setTimeout(() => setCtrlVisible(false), 3200);
  }, []);

  // Start hide timer on mount (ctrlVisible is already true by default)
  useEffect(() => {
    ctrlTimerRef.current = setTimeout(() => setCtrlVisible(false), 3200);
    return () => { if (ctrlTimerRef.current) clearTimeout(ctrlTimerRef.current); };
  }, []);

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); setPlaying((v) => !v); showControls(); }
      if (e.key === "ArrowRight" || e.key === "l") { goNext(); showControls(); }
      if (e.key === "ArrowLeft"  || e.key === "j") { goPrev(); showControls(); }
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, showControls, toggleFullscreen]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const curPhoto  = photos[cur];
  const prevPhoto = prev !== null ? photos[prev] : null;
  const curUrl    = curPhoto  ? (curPhoto.public_url  ?? publicStorageUrl(curPhoto.storage_path))  : null;
  const prevUrl   = prevPhoto ? (prevPhoto.public_url ?? publicStorageUrl(prevPhoto.storage_path)) : null;
  const nextPhoto = photos[(cur + 1) % Math.max(photos.length, 1)];
  const nextUrl   = nextPhoto && nextPhoto.id !== curPhoto?.id
    ? (nextPhoto.public_url ?? publicStorageUrl(nextPhoto.storage_path))
    : null;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div style={s.emptyShell}>
        <div style={s.emptyInner}>
          <div style={s.emptyIcon}>📷</div>
          <h1 style={s.emptyTitle}>{event.title}</h1>
          <p style={s.emptyText}>Aún no hay fotos aprobadas en este evento</p>
          <div style={s.emptyLivePill}>
            <span style={s.liveDot} />
            Esperando fotos en vivo…
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ ...s.shell, cursor: ctrlVisible ? "default" : "none" }}
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      {/* ── Photo layers ── */}
      {/* Previous photo fades out */}
      {prevUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`prev-${transKey}`}
          src={prevUrl}
          alt=""
          aria-hidden="true"
          style={{
            ...s.photoBase,
            animationName: "gdFadeOut",
            animationDuration: "1.2s",
            animationTimingFunction: "ease",
            animationFillMode: "forwards",
          }}
        />
      )}
      {/* Current photo fades in + ken burns (direction cycles through 4 variants) */}
      {curUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`cur-${transKey}`}
          src={curUrl}
          alt={
            curPhoto && !curPhoto.is_anonymous && curPhoto.uploaded_by_name
              ? `Foto de ${curPhoto.uploaded_by_name}`
              : "Foto del evento"
          }
          style={{
            ...s.photoBase,
            objectPosition: "center 25%",
            animationName: transKey === 0
              ? `gdKB${cur % 4}`
              : `gdFadeIn, gdKB${cur % 4}`,
            animationDuration: transKey === 0
              ? `${speed + 3}s`
              : `1.2s, ${speed + 3}s`,
            animationTimingFunction: transKey === 0
              ? "ease-in-out"
              : "ease, ease-in-out",
            animationFillMode: "forwards",
          }}
        />
      )}

      {/* Preload next image silently */}
      {nextUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={nextUrl} alt="" aria-hidden="true" style={s.preload} />
      )}

      {/* Gradients for legibility */}
      <div style={s.gradTop} />
      <div style={s.gradBottom} />

      {/* ── Controls overlay ── */}
      <div
        style={{
          ...s.controls,
          opacity: ctrlVisible ? 1 : 0,
          pointerEvents: ctrlVisible ? "auto" : "none",
        }}
      >
        {/* Top bar: event name + live pill + counter */}
        <div className="gd-top-bar" style={s.topBar}>
          <div>
            <div style={s.topEyebrow}>Galería en vivo</div>
            <div style={s.topTitle}>{event.title}</div>
          </div>
          <div style={s.topRight}>
            <div style={s.livePill}>
              <span style={s.liveDot} />
              En vivo
            </div>
            <span style={s.counter}>{cur + 1} / {photos.length}</span>
          </div>
        </div>

        {/* Bottom bar: progress + controls */}
        <div style={s.bottomBar}>
          {/* Progress bar */}
          <div style={s.progressTrack}>
            <div
              key={`prog-${transKey}-${speed}`}
              style={{
                ...s.progressFill,
                animationDuration: `${speed}s`,
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          </div>

          {/* Buttons row */}
          <div className="gd-btn-row" style={s.btnRow}>
            {/* Prev */}
            <CtrlBtn onClick={() => { goPrev(); showControls(); }} label="Anterior">
              <PrevIcon />
            </CtrlBtn>

            {/* Play / Pause */}
            <CtrlBtn
              onClick={() => { setPlaying((v) => !v); showControls(); }}
              label={playing ? "Pausar" : "Reproducir"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </CtrlBtn>

            {/* Next */}
            <CtrlBtn onClick={() => { goNext(); showControls(); }} label="Siguiente">
              <NextIcon />
            </CtrlBtn>

            {/* Speed chips */}
            <div style={s.speedChips}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSpeed(s); showControls(); }}
                  style={{
                    ...speedChip,
                    ...(speed === s ? speedChipActive : {}),
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* Uploader name */}
            {curPhoto && !curPhoto.is_anonymous && curPhoto.uploaded_by_name && (
              <span style={s.uploaderName}>{curPhoto.uploaded_by_name}</span>
            )}

            {/* Fullscreen — pushed to right */}
            <CtrlBtn
              style={{ marginLeft: "auto" }}
              onClick={toggleFullscreen}
              label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
            </CtrlBtn>
          </div>

          {/* Keyboard hints — hidden on touch/TV devices and portrait */}
          <div className="gd-hints" style={s.hints}>
            <span>Espacio — pausar</span>
            <span>← → — navegar</span>
            <span>F — pantalla completa</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CtrlBtn({
  onClick,
  label,
  children,
  style,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{ ...ctrlBtnBase, ...style }}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}
function CompressIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ctrlBtnBase: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#ffffff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  flexShrink: 0,
  transition: "background 150ms ease",
};

const speedChip: React.CSSProperties = {
  padding: "6px 11px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.5)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
};

const speedChipActive: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.5)",
  background: "rgba(255,255,255,0.18)",
  color: "#ffffff",
  fontWeight: 700,
};

const s: Record<string, React.CSSProperties> = {
  shell: {
    position: "fixed",
    inset: 0,
    background: "#000",
    overflow: "hidden",
  },
  photoBase: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  preload: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  gradTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  gradBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    background: "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)",
    pointerEvents: "none",
  },
  controls: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "opacity 500ms ease",
  },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "24px 28px",
  },
  topEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 6,
  },
  topTitle: {
    fontSize: "clamp(18px, 3vw, 34px)",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.025em",
    lineHeight: 1,
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
    flexShrink: 0,
  },
  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.75)",
  },
  liveDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 0 3px rgba(74,222,128,0.22)",
    flexShrink: 0,
  },
  counter: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.45)",
    fontVariantNumeric: "tabular-nums",
  },
  bottomBar: {
    padding: "12px 28px 32px",
    display: "grid",
    gap: 12,
  },
  progressTrack: {
    height: 2,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "rgba(255,255,255,0.75)",
    borderRadius: 1,
    width: 0,
    animationName: "gdProgress",
    animationTimingFunction: "linear",
    animationFillMode: "forwards",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  speedChips: {
    display: "flex",
    gap: 6,
    marginLeft: 8,
  },
  uploaderName: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.4)",
    marginLeft: 8,
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  hints: {
    display: "flex",
    gap: 20,
    fontSize: 11,
    color: "rgba(255,255,255,0.22)",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },

  // Empty state
  emptyShell: {
    position: "fixed",
    inset: 0,
    background: "#050816",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInner: {
    textAlign: "center",
    display: "grid",
    gap: 14,
    padding: "0 24px",
  },
  emptyIcon: {
    fontSize: 52,
    lineHeight: 1,
  },
  emptyTitle: {
    fontSize: "clamp(22px, 4vw, 40px)",
    fontWeight: 800,
    color: "#ffffff",
    margin: 0,
    letterSpacing: "-0.03em",
  },
  emptyText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    margin: 0,
    lineHeight: 1.6,
  },
  emptyLivePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
};
