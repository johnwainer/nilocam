"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EVENT_BUCKET, FILTERS, TEMPLATES } from "@/lib/constants";
import type { EventRecord, PhotoRecord } from "@/types";
import { formatBytes, publicStorageUrl } from "@/lib/utils";
import { renderEditedImage, type FilterKey, type TemplateKey } from "@/lib/image-tools";

const supabase = createSupabaseBrowserClient();

// CSS filter map — mirrors the canvas filter in image-tools.ts
const FILTER_CSS: Record<FilterKey, string> = {
  none:     "none",
  warm:     "sepia(0.2) saturate(1.22) contrast(1.05) brightness(1.03)",
  golden:   "sepia(0.45) saturate(1.4) brightness(1.05) contrast(1.08)",
  rose:     "sepia(0.15) saturate(1.3) hue-rotate(-15deg) brightness(1.06)",
  vintage:  "sepia(0.55) saturate(0.85) contrast(0.9) brightness(1.1)",
  dream:    "saturate(1.05) contrast(0.96) brightness(1.1)",
  soft:     "brightness(1.14) saturate(0.8) contrast(0.9)",
  fade:     "contrast(0.84) brightness(1.14) saturate(0.7)",
  matte:    "contrast(0.86) saturate(0.78) brightness(1.08) sepia(0.08)",
  cool:     "saturate(0.88) hue-rotate(18deg) brightness(1.05) contrast(1.06)",
  mono:     "grayscale(1) contrast(1.08)",
  noir:     "grayscale(1) contrast(1.45) brightness(0.88)",
  pop:      "saturate(1.5) contrast(1.14) brightness(1.04)",
  vivid:    "saturate(1.8) contrast(1.18) brightness(1.02)",
  dramatic: "contrast(1.4) brightness(0.86) saturate(1.1)",
};

type ComposerProps = {
  event: EventRecord;
  onUploaded?: (photo: PhotoRecord) => void;
  /** compact=true: renders only the action buttons + modal, no card wrapper */
  compact?: boolean;
  accentColor?: string;
};

const LS_NAME_KEY = "nilo-guest-name";

export function PhotoComposer({ event, onUploaded, compact, accentColor }: ComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [template, setTemplate] = useState<TemplateKey>("clean");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  // Pre-fill name from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_NAME_KEY);
      if (saved) setName(saved);
    } catch { /* ignore */ }
  }, []);

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
    // keep name — user shouldn't have to type it again
    setFilter("none");
    setTemplate("clean");
    setIsSaving(false);
    setError(null);
    setAcceptedTerms(true);
  };

  const submit = async () => {
    if (!file) return;
    if (event.landing_config.showTerms && !acceptedTerms) {
      setError("Debes aceptar los términos para continuar.");
      return;
    }
    setIsSaving(true);
    setError(null);

    // Persist name to localStorage so it pre-fills next visit
    const trimmedName = name.trim();
    try {
      if (trimmedName) localStorage.setItem(LS_NAME_KEY, trimmedName);
    } catch { /* ignore */ }

    const isAnon = !trimmedName;

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
        .upload(path, editedBlob, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const moderationStatus = event.moderation_mode === "auto" ? "approved" : "pending";
      const storageUrl = publicStorageUrl(path);

      const { data, error: insertError } = await supabase
        .from("photos")
        .insert({
          event_id: event.id,
          storage_path: path,
          original_name: file.name,
          uploaded_by_name: isAnon ? null : trimmedName,
          uploaded_by_email: null,
          is_anonymous: isAnon,
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

  // ── Action buttons (shared between compact and card mode) ──────────────────
  const actionButtons = (
    <div style={styles.actions}>
      <button
        style={{ ...styles.btnCamera, ...(accentColor ? { background: accentColor } : {}) }}
        onClick={() => openPicker("camera")}
        type="button"
      >
        <CameraIcon />
        Tomar foto
      </button>
      <button style={styles.btnUpload} onClick={() => openPicker("upload")} type="button">
        <UploadIcon />
        Desde galería
      </button>
    </div>
  );

  return (
    <>
      {/* ── Trigger UI ──────────────────────────────────────────────────── */}
      {compact ? (
        <>
          {actionButtons}
          {error ? <div style={{ ...styles.error, marginTop: 10 }}>{error}</div> : null}
        </>
      ) : (
        <div className="card glass" style={styles.wrapper}>
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: "clamp(22px, 5vw, 28px)", color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Tu foto, en la pantalla del evento
            </strong>
            <p style={{ margin: 0, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
              Toma una foto o sube una de tu galería. Aplica filtros y publícala en segundos.
            </p>
          </div>
          {actionButtons}
          {error ? <div style={styles.error}>{error}</div> : null}
        </div>
      )}

      {/* ── Hidden inputs ───────────────────────────────────────────────── */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="sr-only" />
      <input ref={uploadRef} type="file" accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="sr-only" />

      {/* ── Editor modal ────────────────────────────────────────────────── */}
      {isOpen && file && previewUrl ? (
        <div className="pc-backdrop">
          <div className="card glass pc-modal">
            {/* Header */}
            <div style={styles.modalHead}>
              <h3 style={{ fontSize: "clamp(18px, 4vw, 24px)", margin: 0, color: "#fff", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Elige tu estilo
              </h3>
              <button style={styles.btnClose} onClick={reset} aria-label="Cerrar">✕</button>
            </div>

            <div className="pc-editor-grid">
              {/* ── Preview + Filter strip ── */}
              <div style={styles.previewPane}>
                <div style={styles.previewImageWrap}>
                  <Image
                    src={previewUrl}
                    alt="Vista previa"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 48vw"
                    style={{ objectFit: "cover", filter: FILTER_CSS[filter], transition: "filter 200ms ease" }}
                  />

                  {/* ── Template overlays ── */}
                  <TemplateOverlay template={template} />

                  {/* ── Watermark preview ── */}
                  <WatermarkPreview event={event} />

                  {/* Filter + template name badge */}
                  <div style={styles.filterNameBadge}>
                    {FILTERS.find(f => f.key === filter)?.label ?? "Original"}
                    {template !== "clean" ? ` · ${TEMPLATES.find(t => t.key === template)?.label}` : ""}
                  </div>
                </div>

                {/* Filter thumbnail strip */}
                <div style={styles.filterScrollOuter}>
                  <div style={styles.filterScroll}>
                    {FILTERS.map((f) => {
                      const active = filter === (f.key as FilterKey);
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFilter(f.key as FilterKey)}
                          style={styles.filterThumbBtn}
                          aria-label={f.label}
                        >
                          <div style={{
                            ...styles.filterThumbImg,
                            outline: active ? "2.5px solid #ffffff" : "2.5px solid transparent",
                            outlineOffset: 2,
                          }}>
                            <Image
                              src={previewUrl}
                              alt={f.label}
                              fill
                              unoptimized
                              sizes="60px"
                              style={{ objectFit: "cover", filter: FILTER_CSS[f.key as FilterKey] }}
                            />
                          </div>
                          <span style={{
                            ...styles.filterThumbLabel,
                            color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                            fontWeight: active ? 700 : 500,
                          }}>
                            {f.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Form ── */}
              <div style={styles.formPane}>
                {/* Template */}
                <div>
                  <div style={styles.formLabel}>Marco</div>
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

                {/* Name — optional, persisted to localStorage */}
                {event.landing_config.showNameField ? (
                  <label style={styles.formField}>
                    <span style={styles.formLabel}>Tu nombre <span style={{ fontWeight: 400, opacity: 0.55 }}>(opcional)</span></span>
                    <input
                      className="input"
                      placeholder="Déjalo vacío para publicar anónimo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="nickname"
                    />
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
                  type="button"
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

// ── Template overlay component ──────────────────────────────────────────────

function TemplateOverlay({ template }: { template: TemplateKey }) {
  const base: React.CSSProperties = { position: "absolute", pointerEvents: "none", zIndex: 3 };

  if (template === "film") return (
    <>
      <div style={{ ...base, inset: "0 0 auto 0", height: "13%", background: "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, transparent 100%)" }} />
      <div style={{ ...base, inset: "auto 0 0 0", height: "13%", background: "linear-gradient(0deg, rgba(0,0,0,0.82) 0%, transparent 100%)" }} />
    </>
  );

  if (template === "frame") return (
    <>
      <div style={{ ...base, inset: 5, border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 7 }} />
      <div style={{ ...base, inset: 9, border: "2px solid rgba(212,163,115,0.85)", borderRadius: 4 }} />
      {/* Corners */}
      {([
        { top: 13, left: 13 },
        { top: 13, right: 13 },
        { bottom: 13, left: 13 },
        { bottom: 13, right: 13 },
      ] as React.CSSProperties[]).map((pos, i) => {
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div key={i} style={{
            ...base, zIndex: 4, ...pos,
            width: 16, height: 16,
            borderTop: isBottom ? "none" : "2px solid rgba(212,163,115,0.9)",
            borderBottom: isBottom ? "2px solid rgba(212,163,115,0.9)" : "none",
            borderLeft: isRight ? "none" : "2px solid rgba(212,163,115,0.9)",
            borderRight: isRight ? "2px solid rgba(212,163,115,0.9)" : "none",
          }} />
        );
      })}
    </>
  );

  if (template === "polaroid") return (
    <>
      {/* White mat strips — thin on top/sides, thick on bottom */}
      <div style={{ ...base, inset: "0 0 auto 0", height: "4%", background: "#fafaf8" }} />
      <div style={{ ...base, inset: "auto 0 0 0", height: "15%", background: "#fafaf8" }} />
      <div style={{ ...base, inset: "4% auto 15% 0", width: "4%", background: "#fafaf8" }} />
      <div style={{ ...base, inset: "4% 0 15% auto", width: "4%", background: "#fafaf8" }} />
    </>
  );

  if (template === "vignette") return (
    <div style={{ ...base, inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.68) 100%)" }} />
  );

  if (template === "minimal") return (
    <div style={{ ...base, inset: 7, border: "1.5px solid rgba(255,255,255,0.55)", borderRadius: 5 }} />
  );

  if (template === "double") return (
    <>
      <div style={{ ...base, inset: 6, border: "1px solid rgba(255,255,255,0.28)", borderRadius: 7 }} />
      <div style={{ ...base, inset: 11, border: "1.5px solid rgba(255,255,255,0.60)", borderRadius: 4 }} />
    </>
  );

  if (template === "corner") return (
    <>
      {([
        { top: 7, left: 7 },
        { top: 7, right: 7 },
        { bottom: 7, left: 7 },
        { bottom: 7, right: 7 },
      ] as React.CSSProperties[]).map((pos, i) => {
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div key={i} style={{
            ...base, zIndex: 4, ...pos,
            width: 20, height: 20,
            borderTop: isBottom ? "none" : "2.5px solid rgba(255,255,255,0.82)",
            borderBottom: isBottom ? "2.5px solid rgba(255,255,255,0.82)" : "none",
            borderLeft: isRight ? "none" : "2.5px solid rgba(255,255,255,0.82)",
            borderRight: isRight ? "2.5px solid rgba(255,255,255,0.82)" : "none",
          }} />
        );
      })}
    </>
  );

  return null; // clean
}

// ── Watermark preview overlay ────────────────────────────────────────────────

function WatermarkPreview({ event }: { event: EventRecord }) {
  const wUrl = event.landing_config.watermarkUrl;
  if (!wUrl) return null;

  const pos = event.landing_config.watermarkPosition ?? "bottom-right";
  const size = event.landing_config.watermarkSize ?? 18;
  const opacity = event.landing_config.watermarkOpacity ?? 0.75;

  const margin = "8px";
  const posStyle: React.CSSProperties =
    pos === "top-left"     ? { top: margin, left: margin } :
    pos === "top-right"    ? { top: margin, right: margin } :
    pos === "bottom-left"  ? { bottom: margin, left: margin } :
                             { bottom: margin, right: margin };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wUrl}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        ...posStyle,
        width: `${size}%`,
        opacity,
        pointerEvents: "none",
        zIndex: 8,
        display: "block",
      }}
    />
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
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
    minHeight: 280,
  },
  filterNameBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: "rgba(0,0,0,0.55)",
    color: "#ffffff",
    backdropFilter: "blur(8px)",
    letterSpacing: "0.04em",
    zIndex: 10,
  },
  filterScrollOuter: {
    background: "rgba(0,0,0,0.6)",
    padding: "10px 10px 8px",
  },
  filterScroll: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    scrollbarWidth: "none",
    paddingBottom: 2,
  },
  filterThumbBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  filterThumbImg: {
    position: "relative",
    width: 58,
    height: 74,
    borderRadius: 10,
    overflow: "hidden",
    transition: "outline 150ms ease",
  },
  filterThumbLabel: {
    fontSize: 10,
    letterSpacing: "0.03em",
    whiteSpace: "nowrap" as const,
    transition: "color 150ms ease",
  },
  formPane: {
    display: "grid",
    gap: 16,
    alignContent: "start",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
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
