"use client";

// Admin tab: manage person clusters for an event.
// Shows all auto-detected clusters, lets admin name them, add social handles,
// merge clusters, delete, and set a cover face.

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceWithPhoto, PersonWithFaces } from "@/types";
import { publicStorageUrl } from "@/lib/utils";

type Props = {
  eventId: string;
  savedIds: Set<string>;
};

export function PersonasTab({ eventId, savedIds }: Props) {
  const [persons, setPersons] = useState<PersonWithFaces[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ display_name: "", instagram: "", tiktok: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [processProgress, setProcessProgress] = useState<{ done: number; total: number } | null>(null);
  const [reclustering, setReclustering] = useState(false);

  const isSaved = savedIds.has(eventId);

  const loadPersons = useCallback(async () => {
    if (!isSaved) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/persons`);
      const json = await res.json() as { ok: boolean; persons?: PersonWithFaces[] };
      if (json.ok) setPersons(json.persons ?? []);
    } finally {
      setLoading(false);
    }
  }, [eventId, isSaved]);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  const showNotice = (text: string, ok: boolean) => {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 4000);
  };

  // ── Process photos: run face detection client-side, push to API ──────────────

  const processPhotos = async () => {
    setProcessing(true);
    try {
      const { detectFaces, loadImage } = await import("@/lib/face-engine");

      // Fetch all photos for this event via the admin endpoint
      const photosRes = await fetch(`/api/events/${eventId}/photos`);
      const photosJson = await photosRes.json() as { ok: boolean; photos?: Array<{ id: string; storage_path: string; moderation_status: string }> };
      if (!photosJson.ok || !photosJson.photos) {
        showNotice("No se pudieron cargar las fotos.", false);
        return;
      }

      // Only process approved photos
      const photos = photosJson.photos.filter((p) => p.moderation_status === "approved");
      setProcessProgress({ done: 0, total: photos.length });

      let done = 0;
      for (const photo of photos) {
        try {
          const url = publicStorageUrl(photo.storage_path);
          const img = await loadImage(url);
          const faces = await detectFaces(img);

          for (const face of faces) {
            await fetch("/api/faces/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventId,
                photoId: photo.id,
                descriptor: face.descriptor,
                bbox: face.bbox,
              }),
            });
          }
        } catch {
          // Skip unprocessable photos
        }
        done++;
        setProcessProgress({ done, total: photos.length });
      }

      await loadPersons();
      showNotice(`Procesadas ${done} fotos.`, true);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Error procesando fotos.", false);
    } finally {
      setProcessing(false);
      setProcessProgress(null);
    }
  };

  // ── Re-cluster: auto-merge similar unnamed clusters ───────────────────────────

  const recluster = async () => {
    setReclustering(true);
    try {
      const res = await fetch("/api/faces/recluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json() as { ok: boolean; merged?: number; message?: string };
      if (json.ok) {
        await loadPersons();
        showNotice(
          json.merged === 0
            ? "Los grupos ya están optimizados."
            : `Se unieron ${json.merged} grupo${json.merged !== 1 ? "s" : ""} duplicado${json.merged !== 1 ? "s" : ""}.`,
          true
        );
      } else {
        showNotice(json.message ?? "Error al re-agrupar.", false);
      }
    } catch {
      showNotice("Error al re-agrupar.", false);
    } finally {
      setReclustering(false);
    }
  };

  // ── Edit person ──────────────────────────────────────────────────────────────

  const startEdit = (person: PersonWithFaces) => {
    setEditingId(person.id);
    setEditDraft({
      display_name: person.display_name ?? "",
      instagram: person.instagram ?? "",
      tiktok: person.tiktok ?? "",
    });
    setMergeMode(false);
    setMergeSource(null);
  };

  const saveEdit = async (personId: string) => {
    const res = await fetch(`/api/persons/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: editDraft.display_name.trim() || null,
        instagram: editDraft.instagram.trim() || null,
        tiktok: editDraft.tiktok.trim() || null,
      }),
    });
    const json = await res.json() as { ok: boolean; person?: PersonWithFaces };
    if (json.ok && json.person) {
      setPersons((cur) => cur.map((p) => (p.id === personId ? { ...p, ...json.person! } : p)));
      setEditingId(null);
      showNotice("Guardado.", true);
    } else {
      showNotice("Error al guardar.", false);
    }
  };

  // ── Delete person ────────────────────────────────────────────────────────────

  const deletePerson = async (personId: string) => {
    const res = await fetch(`/api/persons/${personId}`, { method: "DELETE" });
    const json = await res.json() as { ok: boolean };
    if (json.ok) {
      setPersons((cur) => cur.filter((p) => p.id !== personId));
      setConfirmDeleteId(null);
      showNotice("Persona eliminada.", true);
    } else {
      showNotice("Error al eliminar.", false);
    }
  };

  // ── Merge persons ────────────────────────────────────────────────────────────

  const handleMergeClick = async (targetId: string) => {
    if (!mergeSource) {
      setMergeSource(targetId);
      return;
    }
    if (mergeSource === targetId) {
      setMergeSource(null);
      return;
    }
    const res = await fetch("/api/persons/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: targetId, mergeId: mergeSource }),
    });
    const json = await res.json() as { ok: boolean };
    if (json.ok) {
      setMergeSource(null);
      setMergeMode(false);
      await loadPersons();
      showNotice("Personas unidas.", true);
    } else {
      showNotice("Error al unir.", false);
    }
  };

  // ── Set cover face ────────────────────────────────────────────────────────────

  const setCoverFace = async (personId: string, faceId: string) => {
    const res = await fetch(`/api/persons/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_face_id: faceId }),
    });
    const json = await res.json() as { ok: boolean; person?: PersonWithFaces };
    if (json.ok && json.person) {
      setPersons((cur) => cur.map((p) => (p.id === personId ? { ...p, cover_face_id: faceId } : p)));
    }
  };

  if (!isSaved) {
    return (
      <div style={s.empty}>
        <p className="muted">Guarda el evento primero para gestionar personas.</p>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      {notice && (
        <div style={{ ...s.notice, ...(notice.ok ? s.noticeOk : s.noticeErr) }}>{notice.text}</div>
      )}

      {/* Header actions */}
      <div style={s.toolbar}>
        <div>
          <h2 style={s.heading}>Reconocimiento facial</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            Detecta y agrupa caras automáticamente en las fotos del evento.
          </p>
        </div>
        <div style={s.toolbarActions}>
          {persons.length > 1 && (
            <>
              <button
                type="button"
                style={mergeMode ? s.btnActive : s.btnSecondary}
                onClick={() => {
                  setMergeMode((v) => !v);
                  setMergeSource(null);
                }}
              >
                {mergeMode ? "Cancelar unión" : "Unir personas"}
              </button>
              <button
                type="button"
                style={s.btnSecondary}
                onClick={recluster}
                disabled={reclustering}
                title="Une automáticamente grupos que parecen ser la misma persona"
              >
                {reclustering ? "Re-agrupando…" : "⚡ Auto-agrupar"}
              </button>
            </>
          )}
          <button
            type="button"
            style={s.btnPrimary}
            onClick={processPhotos}
            disabled={processing}
          >
            {processing
              ? processProgress
                ? `Analizando ${processProgress.done}/${processProgress.total}…`
                : "Cargando modelos…"
              : "▶ Analizar fotos"}
          </button>
          <button
            type="button"
            style={s.btnSecondary}
            onClick={loadPersons}
            disabled={loading}
          >
            {loading ? "Cargando…" : "↺ Actualizar"}
          </button>
        </div>
      </div>

      {mergeMode && (
        <div style={s.mergeBanner}>
          {mergeSource
            ? "Ahora haz clic en otra persona para unirla con la seleccionada."
            : "Haz clic en la primera persona para unir."}
        </div>
      )}

      {loading && !persons.length ? (
        <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>Cargando personas…</p>
      ) : persons.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontWeight: 600 }}>No hay personas detectadas aún.</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Haz clic en &quot;Analizar fotos&quot; para detectar caras automáticamente.
          </p>
        </div>
      ) : (
        <div style={s.grid}>
          {persons.map((person) => {
            const isEditing = editingId === person.id;
            const isConfirmDelete = confirmDeleteId === person.id;
            const isMergeSource = mergeSource === person.id;
            const coverFace = person.faces.find((f) => f.id === person.cover_face_id) ?? person.faces[0];

            return (
              <div
                key={person.id}
                className="card"
                style={{
                  ...s.card,
                  ...(mergeMode ? s.cardMerge : {}),
                  ...(isMergeSource ? s.cardMergeSource : {}),
                }}
                onClick={mergeMode ? () => handleMergeClick(person.id) : undefined}
              >
                {/* Cover face crop */}
                <div style={s.coverWrap}>
                  {coverFace ? (
                    <FaceCrop
                      photoUrl={coverFace.photo_public_url}
                      bbox={coverFace.bbox}
                      size={80}
                    />
                  ) : (
                    <div style={s.coverPlaceholder}>?</div>
                  )}
                  <span style={s.faceCount}>{person.face_count} cara{person.face_count !== 1 ? "s" : ""}</span>
                </div>

                {isEditing ? (
                  <div style={s.editForm} onClick={(e) => e.stopPropagation()}>
                    <input
                      className="input"
                      style={s.editInput}
                      placeholder="Nombre"
                      value={editDraft.display_name}
                      onChange={(e) => setEditDraft((d) => ({ ...d, display_name: e.target.value }))}
                      autoFocus
                    />
                    <input
                      className="input"
                      style={s.editInput}
                      placeholder="Instagram (sin @)"
                      value={editDraft.instagram}
                      onChange={(e) => setEditDraft((d) => ({ ...d, instagram: e.target.value }))}
                    />
                    <input
                      className="input"
                      style={s.editInput}
                      placeholder="TikTok (sin @)"
                      value={editDraft.tiktok}
                      onChange={(e) => setEditDraft((d) => ({ ...d, tiktok: e.target.value }))}
                    />
                    <div style={s.editActions}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: "6px 14px" }}
                        onClick={() => saveEdit(person.id)}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "6px 14px" }}
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={s.cardInfo}>
                    <span style={s.personName}>
                      {person.display_name ?? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Sin nombre</span>}
                    </span>
                    {person.instagram && (
                      <span style={s.handle}>@{person.instagram} (IG)</span>
                    )}
                    {person.tiktok && (
                      <span style={s.handle}>@{person.tiktok} (TT)</span>
                    )}
                    {!mergeMode && (
                      <div style={s.cardActions}>
                        <button type="button" style={s.btnXs} onClick={() => startEdit(person)}>
                          Editar
                        </button>
                        {isConfirmDelete ? (
                          <>
                            <button
                              type="button"
                              style={s.btnXsDanger}
                              onClick={() => deletePerson(person.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              style={s.btnXs}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            style={s.btnXs}
                            onClick={() => setConfirmDeleteId(person.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Face thumbnails strip */}
                {person.faces.length > 0 && !isEditing && (
                  <div style={s.facesStrip}>
                    {person.faces.slice(0, 8).map((face) => (
                      <div
                        key={face.id}
                        style={{
                          ...s.faceThumb,
                          outline: face.id === person.cover_face_id ? "2px solid #111" : "none",
                          cursor: "pointer",
                        }}
                        title={face.id === person.cover_face_id ? "Portada actual" : "Usar como portada"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverFace(person.id, face.id);
                        }}
                      >
                        <FaceCrop photoUrl={face.photo_public_url} bbox={face.bbox} size={36} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── FaceCrop: crops the face region from a full photo ────────────────────────

function FaceCrop({
  photoUrl,
  bbox,
  size,
}: {
  photoUrl: string | null;
  bbox: FaceWithPhoto["bbox"];
  size: number;
}) {
  if (!photoUrl) return <div style={{ width: size, height: size, background: "#e5e7eb", borderRadius: 4 }} />;

  // We can't do CSS crop from an arbitrary image origin, so we use a canvas approach.
  // For simplicity, use a clip-path div with a background-image.
  // The bbox is in pixels of the original image — we use object-position to simulate crop.
  // We render the full img and clip to the face area using overflow:hidden + negative margin trick.

  return (
    <FaceCropCanvas photoUrl={photoUrl} bbox={bbox} size={size} />
  );
}

function FaceCropCanvas({
  photoUrl,
  bbox,
  size,
}: {
  photoUrl: string;
  bbox: FaceWithPhoto["bbox"];
  size: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const pad = Math.max(bbox.width, bbox.height) * 0.3;
      const sx = Math.max(0, bbox.x - pad);
      const sy = Math.max(0, bbox.y - pad);
      const sw = Math.min(img.width - sx, bbox.width + pad * 2);
      const sh = Math.min(img.height - sy, bbox.height + pad * 2);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    };
    img.src = photoUrl;
  }, [photoUrl, bbox, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 6, display: "block" }}
    />
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  panel: { padding: "0 0 40px" },
  toolbar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
    paddingTop: 4,
  },
  heading: { fontSize: 18, fontWeight: 700, margin: 0 },
  toolbarActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  notice: {
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    fontWeight: 500,
  },
  noticeOk: { background: "rgba(16,185,129,0.1)", color: "#065f46", border: "1px solid rgba(16,185,129,0.28)" },
  noticeErr: { background: "rgba(239,68,68,0.08)", color: "#7f1d1d", border: "1px solid rgba(239,68,68,0.2)" },
  mergeBanner: {
    padding: "10px 16px",
    borderRadius: 8,
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.3)",
    color: "#78350f",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 14,
  },
  card: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    cursor: "default",
    transition: "transform 0.1s",
  },
  cardMerge: { cursor: "pointer", outline: "2px dashed rgba(0,0,0,0.15)", outlineOffset: 2 },
  cardMergeSource: { outline: "2px solid #f59e0b", background: "rgba(245,158,11,0.06)" },
  coverWrap: { display: "flex", alignItems: "center", gap: 10 },
  coverPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    background: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    color: "#9ca3af",
    flexShrink: 0,
  },
  faceCount: { fontSize: 11, color: "var(--muted)", fontWeight: 500 },
  cardInfo: { display: "flex", flexDirection: "column", gap: 4 },
  personName: { fontWeight: 600, fontSize: 14 },
  handle: { fontSize: 12, color: "var(--muted)" },
  cardActions: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" },
  editForm: { display: "flex", flexDirection: "column", gap: 6 },
  editInput: { fontSize: 13, padding: "6px 10px" },
  editActions: { display: "flex", gap: 6 },
  facesStrip: { display: "flex", gap: 4, flexWrap: "wrap" },
  faceThumb: { borderRadius: 4, overflow: "hidden", flexShrink: 0 },
  empty: {
    padding: "48px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  btnPrimary: {
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnActive: {
    background: "rgba(245,158,11,0.1)",
    color: "#78350f",
    border: "1px solid rgba(245,158,11,0.4)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnXs: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnXsDanger: {
    background: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
};
