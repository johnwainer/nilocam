"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { EventRecord, PhotoRecord } from "@/types";
import { publicStorageUrl } from "@/lib/utils";

const supabase = createSupabaseBrowserClient();

export function RealtimeGallery({
  event,
  initialPhotos,
  additionalPhotos,
  mode = "grid",
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
  additionalPhotos?: PhotoRecord[];
  mode?: "grid" | "slider";
}) {
  const [photos, setPhotos] = useState<PhotoRecord[]>(initialPhotos);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    const channel = supabase
      .channel(`event-photos-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const row = payload.new as PhotoRecord;
          if (row.moderation_status !== "approved") return;
          setPhotos((cur) => {
            if (cur.some((p) => p.id === row.id)) return cur;
            return [row, ...cur].slice(0, 60);
          });
          setFreshIds((cur) => new Set([...cur, row.id]));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  const allPhotos = useMemo(() => {
    const ids = new Set(photos.map((p) => p.id));
    const extra = (additionalPhotos ?? []).filter((p) => !ids.has(p.id));
    return [...extra, ...photos].slice(0, 60);
  }, [photos, additionalPhotos]);

  useEffect(() => {
    if (!additionalPhotos?.length) return;
    setFreshIds((cur) => {
      const next = new Set(cur);
      additionalPhotos.forEach((p) => next.add(p.id));
      return next;
    });
  }, [additionalPhotos]);

  const count = allPhotos.length;

  const headingText =
    count === 1
      ? `El primer recuerdo de ${event.title}`
      : `${count} recuerdos de ${event.title}`;

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  return (
    <section id="gallery" style={s.section}>
      <div className="container">
        {/* ── Header ── */}
        <div style={s.head}>
          <div style={s.headCopy}>
            <span style={s.eyebrow}>Galería en vivo</span>
            <h2 style={s.title}>{headingText}</h2>
          </div>
          <div style={s.livePill}>
            <span style={s.dot} />
            En vivo
          </div>
        </div>

        {/* ── Grid or Slider ── */}
        {mode === "slider" ? (
          <SliderView
            photos={allPhotos}
            freshIds={freshIds}
            autoplay={event.landing_config.galleryAutoplay ?? false}
            autoplayInterval={event.landing_config.galleryAutoplayInterval ?? 4}
          />
        ) : (
          <div className="rg-masonry">
            {allPhotos.map((photo, i) => (
              <GalleryTile
                key={photo.id}
                photo={photo}
                index={i}
                priority={i < 6}
                isFresh={freshIds.has(photo.id)}
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox (grid mode only) ── */}
      {mode !== "slider" && lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          startIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </section>
  );
}

// ── Slider view ───────────────────────────────────────────────────────────────

const AUTOPLAY_RESUME_DELAY = 3000; // ms idle before resuming after manual nav

function SliderView({
  photos,
  freshIds,
  autoplay,
  autoplayInterval,
}: {
  photos: PhotoRecord[];
  freshIds: Set<string>;
  autoplay: boolean;
  autoplayInterval: number;
}) {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [paused, setPaused] = useState(false);
  // progress bar key — reset on each slide change
  const [progressKey, setProgressKey] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const prevLengthRef = useRef(photos.length);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(index);
  const countRef = useRef(photos.length);

  // Keep refs in sync (no deps — runs after every render)
  useEffect(() => {
    indexRef.current = index;
    countRef.current = photos.length;
  });

  const count = photos.length;

  // When new photo arrives at front, keep visual index on same photo
  useEffect(() => {
    const prev = prevLengthRef.current;
    if (photos.length > prev) {
      const added = photos.length - prev;
      setIndex((i) => Math.min(i + added, photos.length - 1));
    }
    prevLengthRef.current = photos.length;
  }, [photos.length]);

  const go = useCallback((newIndex: number, dir: "left" | "right", manual = false) => {
    setAnimDir(dir);
    setIndex(newIndex);
    setAnimKey((k) => k + 1);
    setProgressKey((k) => k + 1);
    if (manual && autoplay) {
      setPaused(true);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => setPaused(false), AUTOPLAY_RESUME_DELAY);
    }
  }, [autoplay]);

  const prev = useCallback(() => {
    const i = indexRef.current;
    const c = countRef.current;
    go(i > 0 ? i - 1 : c - 1, "left", true);
  }, [go]);

  const next = useCallback((manual = false) => {
    const i = indexRef.current;
    const c = countRef.current;
    go(i < c - 1 ? i + 1 : 0, "right", manual);
  }, [go]);

  // Autoplay interval
  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    const id = setInterval(() => next(false), autoplayInterval * 1000);
    return () => clearInterval(id);
  }, [autoplay, paused, count, autoplayInterval, next]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Cleanup resume timer on unmount
  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  if (count === 0) return null;

  const safeIndex = Math.min(index, count - 1);
  const photo = photos[safeIndex];
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;
  const isNew = freshIds.has(photo.id);
  const showArrows = count > 1;

  return (
    <div style={sl.root}>
      {/* Card — fills full width, arrows overlay on sides */}
      <div
        className="rg-slider-wrap"
        style={sl.cardWrap}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 44) { if (dx < 0) { next(true); } else { prev(); } }
          touchStartX.current = null;
        }}
      >
        {/* Animated photo */}
        <div
          className="rg-slider-card"
          key={animKey}
          style={{
            ...sl.card,
            animationName: `sliderIn${animDir === "right" ? "Right" : "Left"}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={uploader ? `Foto de ${uploader}` : "Foto del evento"}
            style={sl.img}
          />

          {/* Gradient bottom overlay */}
          <div style={sl.overlay} />

          {/* Bottom row: uploader + counter */}
          <div style={sl.bottomRow}>
            {uploader ? (
              <span style={sl.captionName}>{uploader}</span>
            ) : (
              <span />
            )}
            <span style={sl.counter}>
              {safeIndex + 1}<span style={{ opacity: 0.35 }}> / {count}</span>
            </span>
          </div>

          {/* New photo badge */}
          {isNew && <div style={sl.newBadge}>Nueva foto</div>}

          {/* Autoplay progress bar */}
          {autoplay && !paused && count > 1 && (
            <div key={progressKey} style={sl.progressTrack}>
              <div
                className="rg-progress-bar"
                style={{
                  ...sl.progressBar,
                  animationDuration: `${autoplayInterval}s`,
                }}
              />
            </div>
          )}
        </div>

        {/* Prev arrow — overlay left */}
        {showArrows && (
          <button
            className="rg-slider-arrow"
            style={{ ...sl.arrow, left: 10 }}
            onClick={prev}
            aria-label="Anterior"
            type="button"
          >
            <ChevronLeftIcon />
          </button>
        )}

        {/* Next arrow — overlay right */}
        {showArrows && (
          <button
            className="rg-slider-arrow"
            style={{ ...sl.arrow, right: 10 }}
            onClick={() => next(true)}
            aria-label="Siguiente"
            type="button"
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Gallery tile ─────────────────────────────────────────────────────────────

function GalleryTile({
  photo,
  index,
  priority,
  isFresh,
  onClick,
}: {
  photo: PhotoRecord;
  index: number;
  priority?: boolean;
  isFresh?: boolean;
  onClick: () => void;
}) {
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;
  const delay = isFresh ? 0 : Math.min(index, 16) * 55;

  return (
    <div
      className="rg-tile rg-tile-enter"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div style={s.tileInner}>
        <Image
          src={url}
          alt={uploader ? `Foto de ${uploader}` : "Foto del evento"}
          width={540}
          height={675}
          sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw"
          style={{ width: "100%", height: "auto", display: "block" }}
          priority={priority}
        />
        {uploader ? (
          <div style={s.tileName}>{uploader}</div>
        ) : null}
        <div className="rg-zoom-hint" style={s.tileZoomHint}>
          <ZoomIcon />
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: PhotoRecord[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [imgKey, setImgKey] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
    setImgKey((k) => k + 1);
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
    setImgKey((k) => k + 1);
  }, [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const photo = photos[index];
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;

  return (
    <div
      className="lb-backdrop"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 48) { if (dx < 0) { next(); } else { prev(); } }
        touchStartX.current = null;
      }}
    >
      <button
        style={s.lbClose}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Cerrar"
      >
        ✕
      </button>

      {photos.length > 1 && (
        <div style={s.lbCounter}>
          {index + 1} / {photos.length}
        </div>
      )}

      {photos.length > 1 && (
        <button
          style={{ ...s.lbArrow, left: 16 }}
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Anterior"
        >
          ‹
        </button>
      )}

      <div
        key={imgKey}
        className="lb-img-wrap"
        style={s.lbImgWrap}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={uploader ? `Foto de ${uploader}` : "Foto del evento"}
          style={s.lbImg}
        />
        {uploader && (
          <div style={s.lbCaption}>{uploader}</div>
        )}
      </div>

      {photos.length > 1 && (
        <button
          style={{ ...s.lbArrow, right: 16 }}
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Siguiente"
        >
          ›
        </button>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  section: { padding: "64px 0 80px" },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 28,
  },
  headCopy: { display: "grid", gap: 8 },
  eyebrow: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)",
  },
  title: {
    fontSize: "clamp(22px, 4vw, 44px)",
    lineHeight: 1,
    margin: 0,
    color: "#ffffff",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    maxWidth: 640,
  },
  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  dot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 0 3px rgba(74,222,128,0.25)",
    animation: "pulse 2s ease-in-out infinite",
  },
  tileInner: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  },
  tileName: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "20px 12px 10px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: "0.01em",
  },
  tileZoomHint: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(6px)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 200ms ease",
    pointerEvents: "none",
  },
  // Lightbox
  lbClose: {
    position: "fixed",
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
    backdropFilter: "blur(8px)",
  },
  lbCounter: {
    position: "fixed",
    top: 22,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.05em",
    zIndex: 110,
    pointerEvents: "none",
  },
  lbArrow: {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 32,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 110,
    backdropFilter: "blur(8px)",
  },
  lbImgWrap: {
    position: "relative",
    maxWidth: "min(92vw, 900px)",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  lbImg: {
    maxWidth: "100%",
    maxHeight: "82vh",
    objectFit: "contain",
    borderRadius: 16,
    boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
    display: "block",
  },
  lbCaption: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.03em",
  },
};

// Slider-specific styles
const sl: Record<string, React.CSSProperties> = {
  root: {
    width: "100%",
  },
  cardWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    aspectRatio: "4/3",
  } as React.CSSProperties,
  card: {
    position: "absolute",
    inset: 0,
    animationDuration: "340ms",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
  } as React.CSSProperties,
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)",
    pointerEvents: "none",
  },
  bottomRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 2,
  },
  captionName: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "0.01em",
  },
  counter: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.55)",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 3,
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 150ms ease",
  } as React.CSSProperties,
  newBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(74,222,128,0.15)",
    border: "1px solid rgba(74,222,128,0.35)",
    color: "#4ade80",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    zIndex: 3,
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(255,255,255,0.1)",
    zIndex: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "rgba(255,255,255,0.6)",
    width: "0%",
    animationName: "sliderProgress",
    animationTimingFunction: "linear",
    animationFillMode: "forwards",
  },
};
