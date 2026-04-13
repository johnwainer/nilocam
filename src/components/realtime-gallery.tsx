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
          <SliderView photos={allPhotos} freshIds={freshIds} />
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

function SliderView({
  photos,
  freshIds,
}: {
  photos: PhotoRecord[];
  freshIds: Set<string>;
}) {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const touchStartX = useRef<number | null>(null);
  const prevLengthRef = useRef(photos.length);

  const count = photos.length;

  // When new photo arrives at front of array, keep visual index on same photo
  useEffect(() => {
    const prev = prevLengthRef.current;
    if (photos.length > prev) {
      const added = photos.length - prev;
      setIndex((i) => Math.min(i + added, photos.length - 1));
    }
    prevLengthRef.current = photos.length;
  }, [photos.length]);

  const go = useCallback(
    (newIndex: number, dir: "left" | "right") => {
      setAnimDir(dir);
      setIndex(newIndex);
      setAnimKey((k) => k + 1);
    },
    []
  );

  const prev = useCallback(() => {
    go(index > 0 ? index - 1 : count - 1, "left");
  }, [index, count, go]);

  const next = useCallback(() => {
    go(index < count - 1 ? index + 1 : 0, "right");
  }, [index, count, go]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (count === 0) return null;

  const safeIndex = Math.min(index, count - 1);
  const photo = photos[safeIndex];
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;
  const isNew = freshIds.has(photo.id);

  // Dots: show up to 9, then just counter
  const showDots = count <= 9;

  return (
    <div style={sl.root}>
      {/* Counter */}
      <div style={sl.counter}>
        {safeIndex + 1} <span style={{ opacity: 0.4 }}>/</span> {count}
      </div>

      {/* Main row: prev | image | next */}
      <div style={sl.row}>
        {/* Prev arrow */}
        <button
          style={sl.arrow}
          onClick={prev}
          aria-label="Anterior"
          disabled={count < 2}
          type="button"
        >
          <ChevronLeftIcon />
        </button>

        {/* Photo card */}
        <div
          className="rg-slider-card"
          key={animKey}
          style={{
            ...sl.card,
            animationName: `sliderIn${animDir === "right" ? "Right" : "Left"}`,
          }}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 48) { if (dx < 0) { next(); } else { prev(); } }
            touchStartX.current = null;
          }}
        >
          {/* New photo badge */}
          {isNew && (
            <div style={sl.newBadge}>Nueva foto</div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={uploader ? `Foto de ${uploader}` : "Foto del evento"}
            style={sl.img}
          />

          {/* Caption overlay */}
          {uploader && (
            <div style={sl.caption}>
              <span style={sl.captionName}>{uploader}</span>
            </div>
          )}
        </div>

        {/* Next arrow */}
        <button
          style={sl.arrow}
          onClick={next}
          aria-label="Siguiente"
          disabled={count < 2}
          type="button"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Dots / strip */}
      {showDots ? (
        <div style={sl.dots}>
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Foto ${i + 1}`}
              style={{
                ...sl.dot,
                ...(i === safeIndex ? sl.dotActive : {}),
              }}
              onClick={() => go(i, i > safeIndex ? "right" : "left")}
            />
          ))}
        </div>
      ) : (
        <div style={sl.dots}>
          {/* Strip of lines for > 9 photos */}
          {Array.from({ length: Math.min(count, 24) }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Foto ${i + 1}`}
              style={{
                ...sl.strip,
                ...(i === safeIndex ? sl.stripActive : {}),
              }}
              onClick={() => go(i, i > safeIndex ? "right" : "left")}
            />
          ))}
        </div>
      )}
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
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    padding: "0 0 12px",
  },
  counter: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.4)",
    alignSelf: "flex-end",
    paddingRight: 4,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    justifyContent: "center",
  },
  arrow: {
    flexShrink: 0,
    width: 52,
    height: 52,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 150ms ease, transform 100ms ease",
  } as React.CSSProperties,
  card: {
    position: "relative",
    flex: "1 1 0",
    maxWidth: 760,
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    aspectRatio: "4/3",
    animationDuration: "320ms",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
  } as React.CSSProperties,
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "40px 20px 16px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
  },
  captionName: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.88)",
    letterSpacing: "0.01em",
  },
  newBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: "5px 11px",
    borderRadius: 999,
    background: "rgba(74,222,128,0.15)",
    border: "1px solid rgba(74,222,128,0.35)",
    color: "#4ade80",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    zIndex: 2,
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 760,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.2)",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "background 200ms ease, transform 200ms ease",
    flexShrink: 0,
  },
  dotActive: {
    background: "#ffffff",
    transform: "scale(1.25)",
  },
  strip: {
    width: 20,
    height: 3,
    borderRadius: 999,
    background: "rgba(255,255,255,0.15)",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "background 200ms ease",
    flexShrink: 0,
  },
  stripActive: {
    background: "#ffffff",
    width: 28,
  },
};
