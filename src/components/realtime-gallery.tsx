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
}: {
  event: EventRecord;
  initialPhotos: PhotoRecord[];
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
          setPhotos((current) => [row, ...current].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  const featured = photos[0];
  const rest = useMemo(() => photos.slice(1, 8), [photos]);

  return (
    <section className="section" id="gallery">
      <div className="container">
        <div style={styles.head}>
          <div>
            <span className="eyebrow">Galería en vivo</span>
            <h2 className="serif" style={styles.title}>
              Las fotos aparecen mientras avanza el evento
            </h2>
            <p style={styles.subtitle}>
              La vista se actualiza sola. Con moderación manual, las fotos quedan pendientes hasta
              que alguien las aprueba.
            </p>
          </div>
          <div className="pill" style={styles.countPill}>
            <span className="pulse-dot" />
            {photos.length} fotos visibles
          </div>
        </div>

        <div className="rg-layout">
          <article className="card glass rg-featured">
            {featured ? (
              <>
                <div className="rg-featured-img-wrap">
                  <Image
                    src={publicStorageUrl(featured.storage_path)}
                    alt="Foto destacada"
                    fill
                    sizes="(max-width: 820px) 100vw, 60vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={styles.featuredOverlay}>
                  <div className="pill" style={{ color: "#fff", background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}>
                    {featured.is_anonymous ? "Anónimo" : featured.uploaded_by_name || "Invitado"}
                  </div>
                  <strong style={{ color: "#fff" }}>
                    {featured.template_key ? `Plantilla ${featured.template_key}` : "Nueva foto"}
                  </strong>
                </div>
              </>
            ) : (
              <div className="rg-empty">
                <strong style={{ color: "#fff" }}>No hay fotos todavía</strong>
                <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>
                  En cuanto alguien suba la primera foto, aparecerá aquí en grande.
                </p>
              </div>
            )}
          </article>

          <div style={styles.grid}>
            {rest.map((photo) => (
              <article key={photo.id} className="card glass" style={styles.tile}>
                <div style={styles.tileImgWrap}>
                  <Image
                    src={publicStorageUrl(photo.storage_path)}
                    alt="Foto del evento"
                    fill
                    sizes="(max-width: 820px) 50vw, 28vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={styles.tileMeta}>
                  <strong style={{ color: "#fff", fontSize: 14 }}>
                    {photo.is_anonymous ? "Anónimo" : photo.uploaded_by_name || "Invitado"}
                  </strong>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                    {new Date(photo.created_at).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  head: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
    flexWrap: "wrap",
    marginBottom: 22,
  },
  title: {
    fontSize: "clamp(28px, 5vw, 56px)",
    lineHeight: 0.95,
    margin: "10px 0 0",
    maxWidth: 760,
    color: "#ffffff",
  },
  subtitle: {
    margin: "12px 0 0",
    lineHeight: 1.7,
    maxWidth: 720,
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  countPill: {
    color: "rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    flexShrink: 0,
  },
  featuredOverlay: {
    position: "absolute",
    inset: "auto 18px 18px 18px",
    padding: 18,
    borderRadius: 22,
    display: "grid",
    gap: 10,
    background: "linear-gradient(180deg, rgba(8,12,23,0.08), rgba(8,12,23,0.84))",
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignContent: "start",
  },
  tile: {
    overflow: "hidden",
    borderRadius: 24,
  },
  tileImgWrap: {
    position: "relative",
    width: "100%",
    minHeight: 180,
  },
  tileMeta: {
    display: "grid",
    gap: 4,
    padding: 12,
  },
};
