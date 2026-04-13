"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
            // deduplicate — immediate upload may have already added this id
            if (cur.some((p) => p.id === row.id)) return cur;
            return [row, ...cur].slice(0, 40);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  // Merge instantly-added photos (additionalPhotos) with realtime photos, deduplicated
  const allPhotos = useMemo(() => {
    const ids = new Set(photos.map((p) => p.id));
    const extra = (additionalPhotos ?? []).filter((p) => !ids.has(p.id));
    return [...extra, ...photos].slice(0, 40);
  }, [photos, additionalPhotos]);

  const count = allPhotos.length;

  const headingText =
    count === 0
      ? `Sé el primero en compartir un momento de ${event.title}`
      : count === 1
        ? `El primer recuerdo de ${event.title}`
        : `${count} recuerdos de ${event.title}`;

  return (
    <section style={styles.section} id="gallery">
      <div className="container">
        {/* Header */}
        <div style={styles.head}>
          <div style={styles.headCopy}>
            <span style={styles.eyebrow}>Galería en vivo</span>
            <h2 style={styles.title}>{headingText}</h2>
          </div>
          <div style={styles.countPill}>
            <span style={styles.pulseDot} />
            {count} foto{count !== 1 ? "s" : ""}
          </div>
        </div>

        {count === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>📸</span>
            <strong style={{ color: "#fff", fontSize: 18 }}>
              La galería está esperando su primera foto
            </strong>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 380, textAlign: "center" }}>
              En cuanto alguien publique, aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {allPhotos.map((photo, i) => (
              <GalleryTile key={photo.id} photo={photo} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryTile({ photo, priority }: { photo: PhotoRecord; priority?: boolean }) {
  const url = photo.public_url ?? publicStorageUrl(photo.storage_path);
  const uploader = photo.is_anonymous ? null : photo.uploaded_by_name;

  return (
    <div style={styles.tile}>
      <div style={styles.tileImg}>
        <Image
          src={url}
          alt="Foto del evento"
          fill
          sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw"
          style={{ objectFit: "cover" }}
          priority={priority}
        />
        {uploader ? (
          <div style={styles.tileName}>{uploader}</div>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: "72px 0 80px",
    background: "rgba(0,0,0,0.15)",
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 32,
  },
  headCopy: {
    display: "grid",
    gap: 10,
  },
  eyebrow: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.4)",
  },
  title: {
    fontSize: "clamp(26px, 4.5vw, 52px)",
    lineHeight: 0.95,
    margin: 0,
    color: "#ffffff",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    maxWidth: 700,
  },
  countPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  pulseDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 0 3px rgba(74,222,128,0.2)",
    animation: "pulse 2s ease-in-out infinite",
  },
  empty: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
    padding: "72px 24px",
    borderRadius: 28,
    background: "rgba(255,255,255,0.03)",
    border: "1px dashed rgba(255,255,255,0.1)",
  },
  emptyIcon: {
    fontSize: 48,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 10,
  },
  tile: {
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  },
  tileImg: {
    position: "relative",
    width: "100%",
    paddingBottom: "120%", // 5:6 portrait aspect ratio
  },
  tileName: {
    position: "absolute",
    bottom: 10,
    left: 10,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(0,0,0,0.55)",
    color: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    maxWidth: "calc(100% - 20px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
};
