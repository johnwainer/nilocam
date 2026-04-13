"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EVENT_BUCKET, FILTERS, TEMPLATES } from "@/lib/constants";
import type { EventRecord, PhotoRecord } from "@/types";
import { formatBytes, publicStorageUrl } from "@/lib/utils";
import { renderEditedImage, type FilterKey, type TemplateKey } from "@/lib/image-tools";

const supabase = createSupabaseBrowserClient();

type ComposerProps = {
  event: EventRecord;
  onUploaded?: (photo: PhotoRecord) => void;
};

export function PhotoComposer({ event, onUploaded }: ComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("none");
  const [template, setTemplate] = useState<TemplateKey>("clean");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const limitLabel = useMemo(() => formatBytes(event.max_upload_mb * 1024 * 1024), [event.max_upload_mb]);

  const openPicker = (kind: "camera" | "upload") => {
    if (kind === "camera") cameraRef.current?.click();
    else uploadRef.current?.click();
  };

  const onFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.size > event.max_upload_mb * 1024 * 1024) {
      setError(`La foto supera el límite del evento (${limitLabel}).`);
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setIsOpen(true);
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setIsOpen(false);
    setFile(null);
    setPreviewUrl(null);
    setName("");
    setAnonymous(true);
    setFilter("none");
    setTemplate("clean");
    setIsSaving(false);
    setError(null);
    setAcceptedTerms(false);
  };

  const submit = async () => {
    if (!file) return;
    if (event.landing_config.showTerms && !acceptedTerms) {
      setError("Debes aceptar los términos para continuar.");
      return;
    }
    if (!anonymous && !name.trim() && event.landing_config.showNameField) {
      setError("Escribe tu nombre o activa anónimo.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const editedBlob = await renderEditedImage(file, {
        filter,
        template,
        title: event.title,
        subtitle: event.subtitle ?? event.landing_config.heroSubtitle,
      });

      const path = `${event.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(EVENT_BUCKET)
        .upload(path, editedBlob, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const moderationStatus = event.moderation_mode === "auto" ? "approved" : "pending";
      const storageUrl = publicStorageUrl(path);

      const { data, error: insertError } = await supabase
        .from("photos")
        .insert({
          event_id: event.id,
          storage_path: path,
          original_name: file.name,
          uploaded_by_name: anonymous ? null : name.trim() || null,
          uploaded_by_email: null,
          is_anonymous: anonymous,
          moderation_status: moderationStatus,
          filter_name: filter,
          template_key: template,
          size_bytes: editedBlob.size,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      onUploaded?.({ ...data, public_url: storageUrl } as PhotoRecord);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos subir tu foto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="card glass" style={styles.wrapper}>
        <div style={{ display: "grid", gap: 10 }}>
          <span className="eyebrow">Subir o tomar foto</span>
          <strong style={{ fontSize: 22 }}>Participa en segundos desde cualquier celular</strong>
          <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
            Puedes tomar una foto ahora mismo o subir una imagen desde la galería. El límite del evento es {limitLabel}.
          </p>
        </div>
        <div style={styles.actions}>
          <button className="btn btn-primary" onClick={() => openPicker("camera")}>
            Tomar foto
          </button>
          <button className="btn btn-secondary" onClick={() => openPicker("upload")}>
            Subir foto
          </button>
        </div>
        {error ? <div style={styles.error}>{error}</div> : null}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        className="sr-only"
      />

      {isOpen && file && previewUrl ? (
        <div style={styles.modalBackdrop}>
          <div className="card glass" style={styles.modal}>
            <div style={styles.modalHead}>
              <div>
                <span className="eyebrow">Editor visual</span>
                <h3 className="serif" style={{ fontSize: 34, margin: "8px 0 0" }}>
                  Dale estilo antes de publicar
                </h3>
              </div>
              <button className="btn btn-ghost" onClick={reset}>
                Cerrar
              </button>
            </div>

            <div style={styles.modalGrid}>
              <div style={styles.previewPane}>
                <div style={styles.previewImageWrap}>
                  <Image
                    src={previewUrl}
                    alt="Vista previa"
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>
              <div style={styles.formPane}>
                {event.landing_config.showNameField ? (
                  <>
                    <label className="label" htmlFor="guest-name">
                      Nombre del invitado
                    </label>
                    <input
                      id="guest-name"
                      className="input"
                      placeholder="Ej: Andrea"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={anonymous}
                    />
                  </>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Este evento permite subir sin nombre visible.
                  </p>
                )}

                <label style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(event) => setAnonymous(event.target.checked)}
                  />
                  <span>Publicar como anónimo</span>
                </label>

                <div>
                  <div className="label">Filtro</div>
                  <div style={styles.chips}>
                    {FILTERS.map((item) => (
                      <button
                        key={item.key}
                        className="btn"
                        style={filter === item.key ? styles.chipActive : styles.chip}
                        onClick={() => setFilter(item.key as FilterKey)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label">Plantilla</div>
                  <div style={styles.chips}>
                    {TEMPLATES.map((item) => (
                      <button
                        key={item.key}
                        className="btn"
                        style={template === item.key ? styles.chipActive : styles.chip}
                        onClick={() => setTemplate(item.key as TemplateKey)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={submit} disabled={isSaving}>
                  {isSaving ? "Subiendo..." : "Publicar foto"}
                </button>
                {event.landing_config.showTerms ? (
                  <label style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                    />
                    <span>
                      Acepto los términos y autorizo el uso de esta foto dentro del evento.
                    </span>
                  </label>
                ) : null}
                <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                  Si el evento está en moderación, la foto quedará pendiente hasta aprobación.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: 22,
    borderRadius: 28,
    display: "grid",
    gap: 18,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  error: {
    borderRadius: 16,
    padding: 14,
    background: "rgba(251, 113, 133, 0.12)",
    border: "1px solid rgba(251, 113, 133, 0.18)",
    color: "#fecdd3",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(12px)",
    zIndex: 50,
    padding: 18,
    display: "grid",
    placeItems: "center",
  },
  modal: {
    width: "min(1120px, 100%)",
    borderRadius: 30,
    padding: 22,
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
    flexWrap: "wrap",
  },
  modalGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "1fr 0.92fr",
    marginTop: 20,
  },
  previewPane: {
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    minHeight: 420,
  },
  previewImageWrap: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 420,
  },
  formPane: {
    display: "grid",
    gap: 14,
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "var(--muted)",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text)",
  },
  chipActive: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(212,163,115,0.55)",
    background: "rgba(212,163,115,0.12)",
    color: "#fff",
  },
};
