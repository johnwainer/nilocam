"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EVENT_BUCKET, FILTERS, TEMPLATES } from "@/lib/constants";
import type { EventRecord, PhotoRecord } from "@/types";
import { formatBytes, publicStorageUrl } from "@/lib/utils";
import { renderEditedImage, type FilterKey, type TemplateKey } from "@/lib/image-tools";

const supabase = createSupabaseBrowserClient();

// CSS filter map for live preview (approximates the canvas output)
const FILTER_CSS: Record<FilterKey, string> = {
  none: "none",
  warm: "sepia(0.2) saturate(1.22) contrast(1.05) brightness(1.03)",
  dream: "saturate(1.05) contrast(0.96) brightness(1.08)",
  mono: "grayscale(1) contrast(1.08)",
  pop: "saturate(1.5) contrast(1.14) brightness(1.04)",
};

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
      const wm = event.landing_config.watermarkUrl
        ? {
            url: event.landing_config.watermarkUrl,
            position: event.landing_config.watermarkPosition ?? ("bottom-right" as const),
            size: event.landing_config.watermarkSize ?? 18,
            opacity: event.landing_config.watermarkOpacity ?? 0.7,
          }
        : undefined;

      const editedBlob = await renderEditedImage(file, {
        filter,
        template,
        title: event.title,
        subtitle: event.subtitle ?? event.landing_config.heroSubtitle,
        watermark: wm,
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
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: "clamp(22px, 5vw, 28px)", color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Tu foto, en la pantalla del evento
          </strong>
          <p style={{ margin: 0, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
            Toma una foto ahora o sube una de tu galería. Puedes aplicarle un filtro antes de publicarla.
          </p>
        </div>
        <div style={styles.actions}>
          <button style={styles.btnCamera} onClick={() => openPicker("camera")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Tomar foto
          </button>
          <button style={styles.btnUpload} onClick={() => openPicker("upload")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Desde galería
          </button>
        </div>
        {error ? <div style={styles.error}>{error}</div> : null}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="sr-only" />
      <input ref={uploadRef} type="file" accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="sr-only" />

      {isOpen && file && previewUrl ? (
        <div className="pc-backdrop">
          <div className="card glass pc-modal">
            {/* Header */}
            <div style={styles.modalHead}>
              <h3 style={{ fontSize: "clamp(20px, 4vw, 28px)", margin: 0, color: "#fff", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Elige tu estilo
              </h3>
              <button style={styles.btnClose} onClick={reset} aria-label="Cerrar">✕</button>
            </div>

            <div className="pc-editor-grid">
              {/* ── Preview ── */}
              <div style={styles.previewPane}>
                <div style={styles.previewImageWrap}>
                  <Image
                    src={previewUrl}
                    alt="Vista previa"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 48vw"
                    style={{
                      objectFit: "cover",
                      filter: FILTER_CSS[filter],
                      transition: "filter 220ms ease",
                    }}
                  />
                </div>
                {/* Filter strip at bottom of preview */}
                <div style={styles.filterStrip}>
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      style={filter === item.key ? styles.filterBtnActive : styles.filterBtn}
                      onClick={() => setFilter(item.key as FilterKey)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Form ── */}
              <div style={styles.formPane}>
                {/* Template */}
                <div>
                  <div style={styles.formLabel}>Marco / Plantilla</div>
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

                {/* Name */}
                {event.landing_config.showNameField ? (
                  <label style={styles.formField}>
                    <span style={styles.formLabel}>Tu nombre</span>
                    <input
                      id="guest-name"
                      className="input"
                      placeholder="Ej: Andrea"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={anonymous}
                    />
                  </label>
                ) : null}

                {event.landing_config.showAnonymousToggle ? (
                  <label style={styles.checkRow}>
                    <input type="checkbox" checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)} />
                    <span style={{ color: "rgba(255,255,255,0.75)" }}>Publicar como anónimo</span>
                  </label>
                ) : null}

                {event.landing_config.showTerms ? (
                  <label style={styles.checkRow}>
                    <input type="checkbox" checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)} />
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                      Acepto que esta foto se muestre en el evento.
                    </span>
                  </label>
                ) : null}

                <button
                  style={isSaving ? styles.btnPublishDisabled : styles.btnPublish}
                  onClick={submit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={styles.spinner} />
                      Subiendo…
                    </span>
                  ) : "Publicar foto →"}
                </button>

                {event.moderation_mode === "manual" ? (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
                    Este evento usa moderación — tu foto quedará pendiente hasta ser aprobada.
                  </p>
                ) : null}

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
    padding: "22px 24px",
    borderRadius: 28,
    display: "grid",
    gap: 20,
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
    minHeight: 56,
    padding: "0 30px",
    borderRadius: 999,
    background: "#ffffff",
    color: "#060a18",
    fontWeight: 700,
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
    minHeight: 56,
    padding: "0 30px",
    borderRadius: 999,
    background: "transparent",
    border: "1.5px solid rgba(255,255,255,0.3)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    flexShrink: 0,
  },
  error: {
    borderRadius: 14,
    padding: "12px 16px",
    background: "rgba(251,113,133,0.1)",
    border: "1px solid rgba(251,113,133,0.25)",
    color: "#fecdd3",
    fontSize: 14,
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  btnClose: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPane: {
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#000",
    display: "flex",
    flexDirection: "column",
  },
  previewImageWrap: {
    position: "relative",
    width: "100%",
    flex: 1,
    minHeight: 300,
  },
  filterStrip: {
    display: "flex",
    gap: 6,
    padding: "10px 12px",
    background: "rgba(0,0,0,0.5)",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    cursor: "pointer",
  },
  filterBtnActive: {
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.9)",
    background: "#ffffff",
    color: "#060a18",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  formPane: {
    display: "grid",
    gap: 16,
    alignContent: "start",
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  formField: {
    display: "grid",
    gap: 8,
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
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontSize: 14,
  },
  chipActive: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid rgba(212,163,115,0.6)",
    background: "rgba(212,163,115,0.15)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },
  btnPublish: {
    minHeight: 54,
    borderRadius: 999,
    background: "#ffffff",
    color: "#060a18",
    fontWeight: 700,
    fontSize: 17,
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    letterSpacing: "-0.01em",
  },
  btnPublishDisabled: {
    minHeight: 54,
    borderRadius: 999,
    background: "rgba(255,255,255,0.25)",
    color: "rgba(0,0,0,0.45)",
    fontWeight: 700,
    fontSize: 17,
    border: "none",
    cursor: "not-allowed",
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "2.5px solid rgba(0,0,0,0.15)",
    borderTopColor: "#000",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
};
