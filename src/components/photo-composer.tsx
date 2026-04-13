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
          <strong style={{ fontSize: 22, color: "#fff" }}>
            Participa en segundos desde cualquier celular
          </strong>
          <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", fontSize: 15 }}>
            Puedes tomar una foto ahora mismo o subir una imagen desde la galería. El límite del
            evento es {limitLabel}.
          </p>
        </div>
        <div style={styles.stepRow}>
          <span className="pill" style={styles.pill}>1. Captura o sube</span>
          <span className="pill" style={styles.pill}>2. Edita el estilo</span>
          <span className="pill" style={styles.pill}>3. Publica en vivo</span>
        </div>
        <div style={styles.actions}>
          <button style={styles.btnCamera} onClick={() => openPicker("camera")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Tomar foto
          </button>
          <button style={styles.btnUpload} onClick={() => openPicker("upload")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
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
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />

      {isOpen && file && previewUrl ? (
        <div className="pc-backdrop">
          <div className="card glass pc-modal">
            <div style={styles.modalHead}>
              <div>
                <span className="eyebrow">Editor visual</span>
                <h3 className="serif" style={{ fontSize: "clamp(24px, 5vw, 34px)", margin: "8px 0 0", color: "#fff" }}>
                  Dale estilo antes de publicar
                </h3>
              </div>
              <button style={styles.btnClose} onClick={reset}>
                ✕
              </button>
            </div>

            <div className="pc-editor-grid">
              <div style={styles.previewPane}>
                <div style={styles.previewImageWrap}>
                  <Image
                    src={previewUrl}
                    alt="Vista previa"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 48vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>
              <div style={styles.formPane}>
                {event.landing_config.showNameField ? (
                  <>
                    <label className="label" htmlFor="guest-name" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Nombre del invitado
                    </label>
                    <input
                      id="guest-name"
                      className="input"
                      placeholder="Ej: Andrea"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={anonymous}
                    />
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    Este evento permite subir sin nombre visible.
                  </p>
                )}

                <label style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>Publicar como anónimo</span>
                </label>

                <div>
                  <div className="label" style={{ color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Filtro</div>
                  <div style={styles.chips}>
                    {FILTERS.map((item) => (
                      <button
                        key={item.key}
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
                  <div className="label" style={{ color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Plantilla</div>
                  <div style={styles.chips}>
                    {TEMPLATES.map((item) => (
                      <button
                        key={item.key}
                        style={template === item.key ? styles.chipActive : styles.chip}
                        onClick={() => setTemplate(item.key as TemplateKey)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button style={isSaving ? styles.btnPublishDisabled : styles.btnPublish} onClick={submit} disabled={isSaving}>
                  {isSaving ? "Subiendo…" : "Publicar foto"}
                </button>

                {event.landing_config.showTerms ? (
                  <label style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>
                      Acepto los términos y autorizo el uso de esta foto dentro del evento.
                    </span>
                  </label>
                ) : null}

                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
                  Si el evento está en moderación, la foto quedará pendiente hasta aprobación.
                </p>

                {error ? <div style={styles.error}>{error}</div> : null}
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
  stepRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    color: "rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  btnCamera: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 54,
    padding: "0 28px",
    borderRadius: 999,
    background: "#ffffff",
    color: "#0b0f19",
    fontWeight: 600,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    flexShrink: 0,
  },
  btnUpload: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 54,
    padding: "0 28px",
    borderRadius: 999,
    background: "transparent",
    border: "1.5px solid rgba(255,255,255,0.35)",
    color: "#ffffff",
    fontWeight: 500,
    fontSize: 16,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    flexShrink: 0,
  },
  error: {
    borderRadius: 16,
    padding: 14,
    background: "rgba(251, 113, 133, 0.12)",
    border: "1px solid rgba(251, 113, 133, 0.28)",
    color: "#fecdd3",
    fontSize: 14,
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
  },
  btnClose: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPane: {
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    minHeight: 360,
  },
  previewImageWrap: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 360,
  },
  formPane: {
    display: "grid",
    gap: 14,
    alignContent: "start",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    cursor: "pointer",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    fontSize: 14,
  },
  chipActive: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(212,163,115,0.55)",
    background: "rgba(212,163,115,0.15)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  btnPublish: {
    minHeight: 52,
    borderRadius: 999,
    background: "#ffffff",
    color: "#0b0f19",
    fontWeight: 600,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },
  btnPublishDisabled: {
    minHeight: 52,
    borderRadius: 999,
    background: "rgba(255,255,255,0.3)",
    color: "rgba(0,0,0,0.5)",
    fontWeight: 600,
    fontSize: 16,
    border: "none",
    cursor: "not-allowed",
  },
};
