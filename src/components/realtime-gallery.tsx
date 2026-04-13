"use client";

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
              Las fotos aparecen destacadas mientras avanza el evento
            </h2>
          </div>
          <div className="pill">
            <span className="pulse-dot" />
            {photos.length} fotos visibles
          </div>
        </div>

        <div style={styles.layout}>
          <article className="card glass" style={styles.featured}>
            {featured ? (
              <>
                <img src={publicStorageUrl(featured.storage_path)} alt="Foto destacada" style={styles.featuredImg} />
                <div style={styles.featuredOverlay}>
                  <div className="pill" style={{ color: "#fff" }}>
                    {featured.is_anonymous ? "Anónimo" : featured.uploaded_by_name || "Invitado"}
                  </div>
                  <strong>{featured.template_key ? `Plantilla ${featured.template_key}` : "Nueva foto"}</strong>
                </div>
              </>
            ) : (
              <div style={styles.empty}>
                <strong>No hay fotos todavía</strong>
                <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
                  En cuanto alguien suba la primera foto, aparecerá aquí en grande.
                </p>
              </div>
            )}
          </article>

          <div style={styles.grid}>
            {rest.map((photo) => (
              <article key={photo.id} className="card glass" style={styles.tile}>
                <img src={publicStorageUrl(photo.storage_path)} alt="Foto del evento" style={styles.tileImg} />
                <div style={styles.tileMeta}>
                  <strong>{photo.is_anonymous ? "Anónimo" : photo.uploaded_by_name || "Invitado"}</strong>
                  <span className="muted">{new Date(photo.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
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
    fontSize: "clamp(32px, 4vw, 56px)",
    lineHeight: 0.95,
    margin: "10px 0 0",
    maxWidth: 760,
  },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "1.15fr 0.85fr",
  },
  featured: {
    position: "relative",
    minHeight: 720,
    overflow: "hidden",
  },
  featuredImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    minHeight: 720,
  },
  featuredOverlay: {
    position: "absolute",
    inset: "auto 18px 18px 18px",
    padding: 18,
    borderRadius: 22,
    display: "grid",
    gap: 12,
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
  tileImg: {
    aspectRatio: "1 / 1.16",
    width: "100%",
    objectFit: "cover",
  },
  tileMeta: {
    display: "grid",
    gap: 6,
    padding: 14,
  },
  empty: {
    minHeight: 720,
    padding: 28,
    display: "grid",
    alignContent: "center",
    justifyItems: "start",
    gap: 12,
  },
};
