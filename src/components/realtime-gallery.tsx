"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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

  const count = allPhotos.length;

  const headingText =
    count === 1
      ? `El primer recuerdo de ${event.title}`
      : `${count} recuerdos de ${event.title}`;

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
            <GalleryTile key={photo.id} photo={photo} priority={i < 6} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryTile({ photo, priority }: { photo: PhotoRecord; priority?: boolean }) {
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="rg-tile">
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
      </div>
    </div>
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
};
