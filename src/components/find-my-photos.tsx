"use client";

// "Find my photos" button + modal.
// User takes / uploads a selfie, we detect their face and return matching photo IDs.

import { useRef, useState } from "react";

type Props = {
  eventId: string;
  onFound: (photoIds: string[]) => void;
  onClear: () => void;
  isActive: boolean;
  accentColor?: string;
};

export function FindMyPhotos({ eventId, onFound, onClear, isActive, accentColor = "#111" }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "detecting" | "searching" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStatus("detecting");
    setErrorMsg("");

    try {
      const { detectSingleFace, loadImage } = await import("@/lib/face-engine");
      const img = await loadImage(url);
      const descriptor = await detectSingleFace(img);

      if (!descriptor) {
        setStatus("error");
        setErrorMsg("No se detectó ninguna cara. Prueba con otra foto.");
        return;
      }

      setStatus("searching");
      const res = await fetch("/api/faces/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, descriptor }),
      });
      const json = await res.json() as { ok: boolean; photoIds?: string[]; message?: string };

      if (!json.ok) {
        setStatus("error");
        setErrorMsg(json.message ?? "Error al buscar.");
        return;
      }

      const ids = json.photoIds ?? [];
      setResultCount(ids.length);
      setStatus("done");

      if (ids.length > 0) {
        onFound(ids);
        setOpen(false);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado.");
    }
  };

  const handleClear = () => {
    setOpen(false);
    setStatus("idle");
    setPreviewUrl(null);
    setErrorMsg("");
    onClear();
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        style={{
          ...s.trigger,
          ...(isActive ? s.triggerActive : {}),
        }}
        onClick={() => (isActive ? handleClear() : setOpen(true))}
        title={isActive ? "Quitar filtro" : "Buscar mis fotos con selfie"}
      >
        <FaceIcon />
        {isActive ? "Quitar filtro" : "Mis fotos"}
      </button>

      {/* Modal */}
      {open && (
        <div style={s.backdrop} onClick={() => setOpen(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Buscar mis fotos</h2>
              <button type="button" style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            <p style={s.modalDesc}>
              Sube una foto tuya y encontraremos todas las fotos del evento en las que apareces.
            </p>

            {previewUrl && (
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Selfie preview"
                style={s.preview}
              />
            )}

            {status === "error" && (
              <p style={s.errorMsg}>{errorMsg}</p>
            )}

            {status === "done" && resultCount === 0 && (
              <p style={s.noResults}>No encontramos fotos tuyas. Prueba con una foto más nítida.</p>
            )}

            {(status === "detecting" || status === "searching") && (
              <div style={s.statusRow}>
                <span style={s.spinner} />
                <span style={{ fontSize: 13 }}>
                  {status === "detecting" ? "Detectando cara…" : "Buscando en el evento…"}
                </span>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            <button
              type="button"
              style={s.uploadBtn}
              disabled={status === "detecting" || status === "searching"}
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? "Cambiar foto" : "📷 Subir selfie"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FaceIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

const s: Record<string, React.CSSProperties> = {
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    transition: "background 0.15s",
  },
  triggerActive: {
    background: "rgba(255,255,255,0.18)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.4)",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    color: "#111",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0, color: "#111" },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    color: "#888",
    padding: 4,
  },
  modalDesc: { fontSize: 14, color: "#666", margin: 0 },
  preview: {
    width: "100%",
    maxHeight: 220,
    objectFit: "cover",
    borderRadius: 10,
  },
  errorMsg: {
    fontSize: 13,
    color: "#dc2626",
    background: "rgba(239,68,68,0.07)",
    padding: "8px 12px",
    borderRadius: 6,
    margin: 0,
  },
  noResults: {
    fontSize: 13,
    color: "var(--muted)",
    textAlign: "center",
    margin: 0,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(0,0,0,0.15)",
    borderTopColor: "#111",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },
  uploadBtn: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 0",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  },
};
