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
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
  additionalPhotos?: PhotoRecord[];
}) {
  const [photos, setPhotos] = useState<PhotoRecord[]>(initialPhotos);
  // IDs that arrived via realtime (animate as "new")
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

  // Mark additionalPhotos as fresh too (just uploaded)
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

        {/* ── Masonry grid ── */}
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
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          startIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </section>
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

  // Stagger entrance: cap at first 16 tiles, fresh ones use delay 0
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

        {/* Hover zoom hint */}
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
  const [imgKey, setImgKey] = useState(0); // forces re-animation on nav
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
    setImgKey((k) => k + 1);
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
    setImgKey((k) => k + 1);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Prevent body scroll while open
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
        if (Math.abs(dx) > 48) { dx < 0 ? next() : prev(); }
        touchStartX.current = null;
      }}
    >
      {/* Close */}
      <button
        style={s.lbClose}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Cerrar"
      >
        ✕
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <div style={s.lbCounter}>
          {index + 1} / {photos.length}
        </div>
      )}

      {/* Prev arrow */}
      {photos.length > 1 && (
        <button
          style={{ ...s.lbArrow, left: 16 }}
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Anterior"
        >
          ‹
        </button>
      )}

      {/* Image */}
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

      {/* Next arrow */}
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

const s: Record<string, React.CSSProperties> = {
  section: {
    padding: "64px 0 80px",
  },
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
    // CSS class handles hover — done via .rg-tile:hover override below
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
