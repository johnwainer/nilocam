"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  APP_NAME,
  DEFAULT_LANDING_CONFIG,
  EVENT_BUCKET,
  EVENT_TYPES,
  FILTERS,
  LANDING_TEMPLATES,
  TEMPLATES,
  eventTypePresetFromKey,
} from "@/lib/constants";
import { formatBytes, formatDate, publicStorageUrl, siteUrl, toSlug } from "@/lib/utils";
import type { EventRecord, EventTypeKey, LandingTemplatePreset, PhotoRecord, WatermarkPosition } from "@/types";
import { SpyCatIcon } from "@/components/top-nav";
import { SuperAdminPanel } from "@/components/super-admin-panel";

const supabase = createSupabaseBrowserClient();

// ─── helpers ────────────────────────────────────────────────────────────────

const sectionLabels: Record<string, string> = {
  hero: "Hero",
  ctas: "CTAs",
  "how-it-works": "Cómo funciona",
  gallery: "Galería",
  privacy: "Privacidad",
  "event-info": "Datos del evento",
  support: "Soporte",
};

const STATUS_CFG = {
  approved: {
    label: "Aprobada",
    color: "#065f46",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.28)",
  },
  pending: {
    label: "Pendiente",
    color: "#78350f",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.28)",
  },
  rejected: {
    label: "Rechazada",
    color: "#7f1d1d",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.28)",
  },
} as const;

/** Suggested slug prefix per event type */
const SLUG_PREFIX: Record<EventTypeKey, string> = {
  matrimonio: "boda",
  cumpleanos: "cumple",
  quinceanos: "xv",
  "despedida-soltera": "despedida",
  "despedida-soltero": "despedida",
  "baby-shower": "baby",
  aniversario: "aniversario",
  graduacion: "graduacion",
  corporativo: "evento",
  familia: "reunion",
};

/** Allow dashes while typing — only strip trailing dash on blur */
function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");
}

/** Check Supabase for an available slug, append suffix if taken */
async function generateAvailableSlug(base: string): Promise<string> {
  const baseSlug = toSlug(base);
  const { data } = await supabase
    .from("events")
    .select("slug")
    .eq("slug", baseSlug)
    .maybeSingle();
  if (!data) return baseSlug;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`;
    const { data: taken } = await supabase
      .from("events")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (!taken) return candidate;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

const emptyEvent: EventRecord = {
  id: "",
  slug: "",
  title: "",
  subtitle: null,
  event_type_key: "matrimonio",
  owner_email: null,
  event_date: null,
  venue_name: null,
  venue_city: null,
  moderation_mode: "auto",
  max_upload_mb: 12,
  landing_config: DEFAULT_LANDING_CONFIG,
  cover_image_url: null,
  allow_guest_upload: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Create a fully pre-filled draft based on the selected event type */
function createDraftEvent(ownerEmail: string, typeKey: EventTypeKey = "matrimonio"): EventRecord {
  const preset = eventTypePresetFromKey(typeKey);
  const year = new Date().getFullYear();
  return {
    ...emptyEvent,
    id: crypto.randomUUID(),
    slug: "", // filled when createNew() resolves the available slug
    event_type_key: preset.key,
    title: preset.sampleTitle,
    subtitle: preset.sampleSubtitle,
    owner_email: ownerEmail,
    landing_config: {
      ...DEFAULT_LANDING_CONFIG,
      heroEyebrow: `${preset.name} · ${year}`,
      heroTitle: preset.sampleTitle,
      heroSubtitle: preset.sampleSubtitle,
      introCopy: DEFAULT_LANDING_CONFIG.introCopy,
      theme: {
        ...DEFAULT_LANDING_CONFIG.theme,
        accent: preset.accent,
        accentSoft: preset.accentSoft,
        heroImage: preset.heroImage,
      },
    },
  };
}

// ─── component ──────────────────────────────────────────────────────────────

export function AdminDashboard({
  userEmail,
  initialEvents,
  isSuperAdmin = false,
}: {
  userEmail: string;
  initialEvents: EventRecord[];
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();

  const initialDraft = initialEvents[0] ?? createDraftEvent(userEmail);
  const [events, setEvents] = useState<EventRecord[]>(
    initialEvents.length > 0 ? initialEvents : [initialDraft]
  );
  const [selectedId, setSelectedId] = useState<string>(initialDraft.id);
  const [tab, setTab] = useState<"evento" | "fotos">("evento");
  const [mainView, setMainView] = useState<"editor" | "system">("editor");

  // Photo management
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "all"
  );

  // Selection + export
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [exportState, setExportState] = useState<{ done: number; total: number } | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Saving / deleting
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);

  // Feedback
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  // Mobile sidebar drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Watermark upload
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const watermarkInputRef = useRef<HTMLInputElement | null>(null);

  // ── derived ────────────────────────────────────────────────────────────────

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? events[0] ?? emptyEvent,
    [events, selectedId]
  );

  const pendingCount = useMemo(
    () => photos.filter((p) => p.moderation_status === "pending").length,
    [photos]
  );

  const filteredPhotos = useMemo(() => {
    if (photoFilter === "all") return photos;
    return photos.filter((p) => p.moderation_status === photoFilter);
  }, [photos, photoFilter]);

  const photoCounts = useMemo(
    () => ({
      all: photos.length,
      pending: photos.filter((p) => p.moderation_status === "pending").length,
      approved: photos.filter((p) => p.moderation_status === "approved").length,
      rejected: photos.filter((p) => p.moderation_status === "rejected").length,
    }),
    [photos]
  );

  // ── photo ops ──────────────────────────────────────────────────────────────

  const loadPhotos = useCallback(async (eventId: string) => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/photos`);
      const json = await res.json();
      if (json.ok) {
        setPhotos(json.photos as PhotoRecord[]);
      } else {
        setNotice({ text: json.message ?? "Error al cargar fotos.", ok: false });
      }
    } catch {
      setNotice({ text: "Error al cargar fotos.", ok: false });
    } finally {
      setPhotosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "fotos" && selectedId) {
      loadPhotos(selectedId);
    }
  }, [tab, selectedId, loadPhotos]);

  const moderatePhoto = async (photoId: string, status: "approved" | "rejected" | "pending") => {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.ok) {
      setPhotos((cur) =>
        cur.map((p) => (p.id === photoId ? { ...p, moderation_status: status } : p))
      );
    } else {
      setNotice({ text: json.message ?? "Error al moderar foto.", ok: false });
    }
  };

  const deletePhoto = async (photoId: string) => {
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) {
      setPhotos((cur) => cur.filter((p) => p.id !== photoId));
      setDeletingPhotoId(null);
    } else {
      setNotice({ text: json.message ?? "Error al eliminar foto.", ok: false });
      setDeletingPhotoId(null);
    }
  };

  // ── event ops ─────────────────────────────────────────────────────────────

  const createNew = async () => {
    setCreating(true);
    try {
      const typeKey = selected?.event_type_key ?? "matrimonio";
      const prefix = SLUG_PREFIX[typeKey] ?? "evento";
      const year = new Date().getFullYear();
      const slug = await generateAvailableSlug(`${prefix}-${year}`);

      const draft = createDraftEvent(userEmail, typeKey);
      draft.slug = slug;

      setEvents((cur) => [draft, ...cur]);
      setSelectedId(draft.id);
      setTab("evento");
      setNotice({
        text: "Borrador creado con plantilla inicial. Personaliza el título, el slug y guarda.",
        ok: true,
      });
    } finally {
      setCreating(false);
    }
  };

  const saveEvent = async () => {
    if (!selected.slug || !selected.title) {
      setNotice({ text: "Completa el título y el slug antes de guardar.", ok: false });
      return;
    }
    setSaving(true);
    setNotice(null);
    const payload = {
      id: selected.id || crypto.randomUUID(),
      slug: toSlug(selected.slug), // final cleanup on save
      title: selected.title,
      subtitle: selected.subtitle,
      event_type_key: selected.event_type_key,
      owner_email: selected.owner_email ?? userEmail,
      event_date: selected.event_date,
      venue_name: selected.venue_name,
      venue_city: selected.venue_city,
      moderation_mode: selected.moderation_mode,
      max_upload_mb: selected.max_upload_mb,
      landing_config: selected.landing_config,
      cover_image_url: selected.cover_image_url,
      allow_guest_upload: selected.allow_guest_upload,
    };
    const { data, error } = await supabase.from("events").upsert(payload).select("*").single();
    setSaving(false);
    if (error) {
      setNotice({ text: error.message, ok: false });
      return;
    }
    setEvents((cur) => {
      const rest = cur.filter((e) => e.id !== data.id);
      return [data as EventRecord, ...rest];
    });
    setSelectedId(data.id);
    setNotice({ text: "Evento guardado. Comparte la URL o el QR con tus invitados.", ok: true });
  };

  const deleteEvent = async () => {
    if (!selected?.id) return;
    setDeletingEvent(true);
    const res = await fetch(`/api/events/${selected.id}`, { method: "DELETE" });
    const json = await res.json();
    setDeletingEvent(false);
    setConfirmDeleteEvent(false);
    if (json.ok) {
      const remaining = events.filter((e) => e.id !== selected.id);
      if (remaining.length > 0) {
        setEvents(remaining);
        setSelectedId(remaining[0].id);
      } else {
        const draft = createDraftEvent(userEmail);
        setEvents([draft]);
        setSelectedId(draft.id);
      }
      setPhotos([]);
      setTab("evento");
      setNotice({ text: "Evento eliminado correctamente.", ok: true });
    } else {
      setNotice({ text: json.message ?? "Error al eliminar evento.", ok: false });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  };

  // ── field helpers ──────────────────────────────────────────────────────────

  const updateSelected = <K extends keyof EventRecord>(key: K, value: EventRecord[K]) => {
    setEvents((cur) => cur.map((e) => (e.id === selected.id ? { ...e, [key]: value } : e)));
  };

  const updateLanding = <K extends keyof EventRecord["landing_config"]>(
    key: K,
    value: EventRecord["landing_config"][K]
  ) => {
    setEvents((cur) =>
      cur.map((e) =>
        e.id === selected.id
          ? { ...e, landing_config: { ...e.landing_config, [key]: value } }
          : e
      )
    );
  };

  const applyPreset = (key: EventTypeKey) => {
    const preset = eventTypePresetFromKey(key);
    const year = new Date().getFullYear();
    setEvents((cur) =>
      cur.map((e) =>
        e.id === selected.id
          ? {
              ...e,
              event_type_key: key,
              title: preset.sampleTitle,
              subtitle: preset.sampleSubtitle,
              landing_config: {
                ...e.landing_config,
                heroEyebrow: `${preset.name} · ${year}`,
                heroTitle: preset.sampleTitle,
                heroSubtitle: preset.sampleSubtitle,
                theme: {
                  ...e.landing_config.theme,
                  accent: preset.accent,
                  accentSoft: preset.accentSoft,
                  heroImage: preset.heroImage,
                },
              },
            }
          : e
      )
    );
  };

  const applyTemplate = (t: LandingTemplatePreset) => {
    setEvents((cur) =>
      cur.map((e) =>
        e.id === selected.id
          ? {
              ...e,
              landing_config: {
                ...e.landing_config,
                templateKey: t.key,
                theme: { ...e.landing_config.theme, ...t.theme },
              },
            }
          : e
      )
    );
  };

  const uploadWatermark = async (file: File) => {
    if (!selected.id) return;
    setWatermarkUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `watermarks/${selected.id}.${ext}`;
      const { error } = await supabase.storage
        .from(EVENT_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const url = publicStorageUrl(path);
      updateLanding("watermarkUrl", url);
      if (!selected.landing_config.watermarkPosition) updateLanding("watermarkPosition", "bottom-right");
      if (!selected.landing_config.watermarkSize) updateLanding("watermarkSize", 18);
      if (!selected.landing_config.watermarkOpacity) updateLanding("watermarkOpacity", 0.75);
      setNotice({ text: "Marca de agua subida. Guarda el evento para aplicar.", ok: true });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Error al subir la imagen.", ok: false });
    } finally {
      setWatermarkUploading(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl(`/event/${selected.slug}`));
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2200);
    } catch {
      // ignore
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("admin-qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${selected.slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const exportPhotos = async (ids: string[]) => {
    if (ids.length === 0) return;
    setExportState({ done: 0, total: ids.length });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let done = 0;

      // Fetch all in parallel (JPEG files are already compressed — use store level)
      await Promise.all(
        ids.map(async (id, i) => {
          const photo = photos.find((p) => p.id === id);
          if (!photo) return;
          try {
            const url = publicStorageUrl(photo.storage_path);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const uploader = photo.is_anonymous
              ? "anonimo"
              : (photo.uploaded_by_name ?? "invitado").replace(/[^a-z0-9]/gi, "_").toLowerCase();
            zip.file(`${String(i + 1).padStart(3, "0")}_${uploader}.jpg`, blob, { binary: true, compression: "STORE" });
          } catch { /* skip failed fetch */ } finally {
            done++;
            setExportState({ done, total: ids.length });
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.slug || "fotos"}-nilo-cam.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Error al exportar.", ok: false });
    } finally {
      setExportState(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div className="container" style={s.headerInner}>
          {/* Brand — same structure as TopNav */}
          <div style={s.headerBrand}>
            <SpyCatIcon size={32} />
            <strong style={s.headerTitle}>{APP_NAME}</strong>
            <span className="pill" style={s.adminPill}>
              {isSuperAdmin ? "Super admin" : "Admin"}
            </span>
          </div>

          {/* Right actions */}
          <div style={s.headerRight}>
            <span className="admin-header-email" style={s.headerEmail}>{userEmail}</span>
            <button className="btn btn-ghost" style={s.headerBtn} onClick={signOut} type="button">
              Salir
            </button>
            {/* Hamburger — mobile only */}
            <button
              className="admin-hamburger"
              style={s.hamburger}
              onClick={() => setSidebarOpen((v) => !v)}
              type="button"
              aria-label="Menú de eventos"
            >
              <HamburgerIcon open={sidebarOpen} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="admin-drawer-backdrop"
          style={s.drawerBackdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Body ── */}
      <div style={s.body}>
        {/* ── Sidebar ── */}
        <aside className={`admin-sidebar${sidebarOpen ? " admin-sidebar-open" : ""}`} style={s.sidebar}>
          <button
            className="btn btn-primary"
            style={s.createBtn}
            onClick={createNew}
            disabled={creating}
            type="button"
          >
            {creating ? "Generando..." : "+ Nuevo evento"}
          </button>
          <div style={s.eventList}>
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedId(event.id);
                  setTab("evento");
                  setMainView("editor");
                  setSidebarOpen(false);
                }}
                style={event.id === selectedId ? s.eventItemActive : s.eventItem}
              >
                <strong style={s.eventItemTitle}>{event.title || "Nuevo evento"}</strong>
                <span style={s.eventItemSlug}>{event.slug || "sin slug"}</span>
                {event.owner_email && isSuperAdmin && (
                  <span style={s.eventItemOwner}>{event.owner_email}</span>
                )}
                <span className="pill" style={s.eventItemPill}>
                  {eventTypePresetFromKey(event.event_type_key).name}
                </span>
              </button>
            ))}
          </div>
          {isSuperAdmin && (
            <div style={s.sidebarBottom}>
              <button
                type="button"
                style={mainView === "system" ? s.systemBtnActive : s.systemBtn}
                onClick={() => {
                  setMainView((v) => v === "system" ? "editor" : "system");
                  setSidebarOpen(false);
                }}
              >
                ⚙ Sistema
              </button>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <div className="admin-main-wrap" style={s.mainWrap}>
          {/* ── Super admin system panel ── */}
          {mainView === "system" && isSuperAdmin && (
            <div style={s.main}>
              <SuperAdminPanel
                userEmail={userEmail}
                onSelectEvent={(eventId) => {
                  setSelectedId(eventId);
                  setTab("evento");
                  setMainView("editor");
                }}
              />
            </div>
          )}

          {mainView === "editor" && <div style={s.main}>
            {/* Event header */}
            <div className="admin-event-header" style={s.eventHeader}>
              <div>
                <span className="eyebrow">
                  {eventTypePresetFromKey(selected.event_type_key).name}
                </span>
                <h1 className="serif" style={s.eventTitle}>
                  {selected.title || "Nuevo evento"}
                </h1>
              </div>
              <div className="admin-event-header-actions" style={s.eventHeaderActions}>
                {selected.slug && (
                  <>
                    <a
                      className="btn btn-secondary"
                      href={siteUrl(`/event/${selected.slug}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.headerActionBtn}
                    >
                      Abrir landing ↗
                    </a>
                    <a
                      className="btn btn-secondary"
                      href={siteUrl(`/event/${selected.slug}/display`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...s.headerActionBtn, gap: 7 }}
                      title="Vista galería rotativa para proyectar en pantalla grande"
                    >
                      <DisplayIcon /> Pantalla
                    </a>
                  </>
                )}
                <button
                  className="btn btn-primary"
                  onClick={saveEvent}
                  disabled={saving}
                  style={s.headerActionBtn}
                  type="button"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>

            {/* Notice */}
            {notice && (
              <div style={{ ...s.notice, ...(notice.ok ? s.noticeOk : s.noticeErr) }}>
                {notice.text}
              </div>
            )}

            {/* Tab bar */}
            <div style={s.tabBar}>
              <button
                type="button"
                style={tab === "evento" ? s.tabActive : s.tabInactive}
                onClick={() => setTab("evento")}
              >
                Evento
              </button>
              <button
                type="button"
                style={tab === "fotos" ? s.tabActive : s.tabInactive}
                onClick={() => setTab("fotos")}
              >
                Fotos
                {pendingCount > 0 && <span style={s.tabBadge}>{pendingCount} pendientes</span>}
              </button>
            </div>

            {/* ── EVENTO TAB ── */}
            {tab === "evento" && (
              <div className="admin-editor-grid" style={s.editorGrid}>
                {/* Left: form */}
                <div style={s.form}>

                  {/* ── 1. TU EVENTO ───────────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Tu evento</span>
                      <p style={s.sectionDesc}>Los datos básicos que identifican el evento.</p>
                    </div>

                    <label style={s.field}>
                      <span className="label">Tipo de evento</span>
                      <select
                        className="select"
                        value={selected.event_type_key}
                        onChange={(e) => applyPreset(e.target.value as EventTypeKey)}
                      >
                        {EVENT_TYPES.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.name}</option>
                        ))}
                      </select>
                    </label>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Título</span>
                        <input
                          className="input"
                          placeholder="Boda de Laura &amp; Mateo"
                          value={selected.title}
                          onChange={(e) => updateSelected("title", e.target.value)}
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Subtítulo <span style={s.optionalTag}>opcional</span></span>
                        <input
                          className="input"
                          placeholder="Un día para recordar"
                          value={selected.subtitle ?? ""}
                          onChange={(e) => updateSelected("subtitle", e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Fecha</span>
                        <input
                          className="input"
                          type="date"
                          value={selected.event_date ? selected.event_date.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateSelected("event_date", e.target.value ? new Date(e.target.value).toISOString() : null)
                          }
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Ciudad <span style={s.optionalTag}>opcional</span></span>
                        <input
                          className="input"
                          placeholder="Bogotá"
                          value={selected.venue_city ?? ""}
                          onChange={(e) => updateSelected("venue_city", e.target.value)}
                        />
                      </label>
                    </div>

                    <label style={s.field}>
                      <span className="label">Lugar / Venue <span style={s.optionalTag}>opcional</span></span>
                      <input
                        className="input"
                        placeholder="Club El Nogal"
                        value={selected.venue_name ?? ""}
                        onChange={(e) => updateSelected("venue_name", e.target.value)}
                      />
                    </label>

                    <label style={s.field}>
                      <span className="label">URL del evento</span>
                      <input
                        className="input"
                        placeholder="boda-laura-mateo-2026"
                        value={selected.slug}
                        onChange={(e) => updateSelected("slug", sanitizeSlugInput(e.target.value))}
                        onBlur={(e) => updateSelected("slug", toSlug(e.target.value))}
                      />
                      <span style={s.fieldHint}>
                        {siteUrl(`/event/${selected.slug || "tu-slug"}`)}
                      </span>
                    </label>
                  </div>

                  {/* ── 2. DISEÑO ──────────────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Diseño visual</span>
                      <p style={s.sectionDesc}>Elige una plantilla y listo. Puedes ajustar los colores después.</p>
                    </div>

                    <div style={s.field}>
                      <div style={s.templateGrid}>
                        {LANDING_TEMPLATES.map((t) => {
                          const active = (selected.landing_config.templateKey ?? "") === t.key;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              style={{
                                ...s.templateCard,
                                outline: active ? "2.5px solid #111" : "2px solid transparent",
                                outlineOffset: 2,
                              }}
                              onClick={() => applyTemplate(t)}
                              title={t.description}
                            >
                              <TemplateMiniPreview theme={t.theme} />
                              <span style={{
                                ...s.templateLabel,
                                fontWeight: active ? 700 : 600,
                                color: active ? "#111" : "var(--muted)",
                              }}>{t.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Color de acento</span>
                        <div style={s.colorPickerRow}>
                          <input
                            type="color"
                            value={selected.landing_config.theme.accent}
                            onChange={(e) => updateLanding("theme", { ...selected.landing_config.theme, accent: e.target.value })}
                            style={s.colorInput}
                          />
                          <span style={s.colorHex}>{selected.landing_config.theme.accent}</span>
                        </div>
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Imagen de fondo hero <span style={s.optionalTag}>URL</span></span>
                        <input
                          className="input"
                          placeholder="https://..."
                          value={selected.landing_config.theme.heroImage ?? ""}
                          onChange={(e) => updateLanding("theme", { ...selected.landing_config.theme, heroImage: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>

                  {/* ── 3. GALERÍA ─────────────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Galería de fotos</span>
                      <p style={s.sectionDesc}>Cómo se muestran las fotos del evento en la landing.</p>
                    </div>

                    <div style={s.field}>
                      <span className="label">Vista de la galería</span>
                      <div style={s.modeChips}>
                        {([
                          { v: "grid",   label: "Cuadrícula", desc: "Todas las fotos en mosaico" },
                          { v: "slider", label: "Slider",     desc: "Una foto a la vez con flechas" },
                        ] as { v: "grid" | "slider"; label: string; desc: string }[]).map(({ v, label, desc }) => {
                          const active = (selected.landing_config.galleryMode ?? "grid") === v;
                          return (
                            <button key={v} type="button"
                              style={{ ...(active ? s.modeChipActive : s.modeChip), borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 18px", gap: 2, minWidth: 140 }}
                              onClick={() => updateLanding("galleryMode", v)}
                            >
                              <span style={{ fontWeight: 700 }}>{label}</span>
                              <span style={{ fontSize: 12, opacity: 0.65 }}>{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(selected.landing_config.galleryMode ?? "grid") === "slider" && (
                      <div style={s.field}>
                        <span className="label">Reproducción automática</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selected.landing_config.galleryAutoplay ?? false}
                              onChange={(e) => updateLanding("galleryAutoplay", e.target.checked)}
                              style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            <span style={{ fontSize: 14 }}>Avanzar fotos automáticamente</span>
                          </label>
                          {(selected.landing_config.galleryAutoplay ?? false) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span className="muted" style={{ fontSize: 13, flexShrink: 0 }}>Cambiar cada</span>
                              <div style={{ display: "flex", gap: 6 }}>
                                {[3, 4, 5, 7, 10].map((sec) => {
                                  const active = (selected.landing_config.galleryAutoplayInterval ?? 4) === sec;
                                  return (
                                    <button key={sec} type="button"
                                      style={{ ...(active ? s.modeChipActive : s.modeChip), padding: "7px 14px", borderRadius: 999, fontSize: 13 }}
                                      onClick={() => updateLanding("galleryAutoplayInterval", sec)}
                                    >{sec}s</button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 4. FOTOS Y SUBIDA ──────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Subida de fotos</span>
                      <p style={s.sectionDesc}>Controla cómo y qué pueden subir tus invitados.</p>
                    </div>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Moderación</span>
                        <select
                          className="select"
                          value={selected.moderation_mode}
                          onChange={(e) => updateSelected("moderation_mode", e.target.value as EventRecord["moderation_mode"])}
                        >
                          <option value="auto">Automática — aparecen al instante</option>
                          <option value="manual">Manual — apruebas tú cada foto</option>
                        </select>
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Peso máximo por foto (MB)</span>
                        <input
                          className="input"
                          type="number"
                          min={2}
                          max={40}
                          value={selected.max_upload_mb}
                          onChange={(e) => updateSelected("max_upload_mb", Number(e.target.value))}
                        />
                      </label>
                    </div>

                    <div className="admin-check-grid" style={s.checkGrid}>
                      <label style={s.checkRow}>
                        <input type="checkbox" checked={selected.allow_guest_upload} onChange={(e) => updateSelected("allow_guest_upload", e.target.checked)} />
                        <span>Permitir subida a invitados</span>
                      </label>
                      <label style={s.checkRow}>
                        <input type="checkbox" checked={selected.landing_config.showNameField} onChange={(e) => updateLanding("showNameField", e.target.checked)} />
                        <span>Pedir nombre al invitado</span>
                      </label>
                      <label style={s.checkRow}>
                        <input type="checkbox" checked={selected.landing_config.showAnonymousToggle} onChange={(e) => updateLanding("showAnonymousToggle", e.target.checked)} />
                        <span>Permitir subida anónima</span>
                      </label>
                      <label style={s.checkRow}>
                        <input type="checkbox" checked={selected.landing_config.showTerms} onChange={(e) => updateLanding("showTerms", e.target.checked)} />
                        <span>Mostrar términos y condiciones</span>
                      </label>
                    </div>

                    <div style={s.field}>
                      <span className="label">Filtros de color</span>
                      <div style={s.modeChips}>
                        {([
                          { v: "allow",  label: "Invitado elige" },
                          { v: "none",   label: "Sin filtros" },
                          { v: "forced", label: "Fijar uno" },
                        ] as { v: "allow" | "none" | "forced"; label: string }[]).map(({ v, label }) => {
                          const active = (selected.landing_config.filtersMode ?? "allow") === v;
                          return (
                            <button key={v} type="button" style={active ? s.modeChipActive : s.modeChip} onClick={() => updateLanding("filtersMode", v)}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {(selected.landing_config.filtersMode ?? "allow") === "forced" && (
                        <div style={{ marginTop: 12 }}>
                          <span className="label" style={{ marginBottom: 10, display: "block" }}>Filtro para todos</span>
                          <div style={s.filterGrid}>
                            {FILTERS.map((f) => {
                              const active = (selected.landing_config.forcedFilter ?? "none") === f.key;
                              return (
                                <button key={f.key} type="button" style={active ? s.filterChipActive : s.filterChip} onClick={() => updateLanding("forcedFilter", f.key)}>
                                  {f.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={s.field}>
                      <span className="label">Marcos decorativos</span>
                      <div style={s.modeChips}>
                        {([
                          { v: "allow",  label: "Invitado elige" },
                          { v: "none",   label: "Sin marcos" },
                          { v: "forced", label: "Fijar uno" },
                        ] as { v: "allow" | "none" | "forced"; label: string }[]).map(({ v, label }) => {
                          const active = (selected.landing_config.templatesMode ?? "allow") === v;
                          return (
                            <button key={v} type="button" style={active ? s.modeChipActive : s.modeChip} onClick={() => updateLanding("templatesMode", v)}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {(selected.landing_config.templatesMode ?? "allow") === "forced" && (
                        <div style={{ marginTop: 12 }}>
                          <span className="label" style={{ marginBottom: 10, display: "block" }}>Marco para todos</span>
                          <div style={s.filterGrid}>
                            {TEMPLATES.map((t) => {
                              const active = (selected.landing_config.forcedTemplate ?? "clean") === t.key;
                              return (
                                <button key={t.key} type="button" style={active ? s.filterChipActive : s.filterChip} onClick={() => updateLanding("forcedTemplate", t.key)}>
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 5. TEXTOS DE LA LANDING ────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Textos de la landing</span>
                      <p style={s.sectionDesc}>Lo que leerán tus invitados. Se pre-rellenan al elegir el tipo de evento.</p>
                    </div>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Título principal</span>
                        <input
                          className="input"
                          placeholder="Boda de Laura &amp; Mateo"
                          value={selected.landing_config.heroTitle}
                          onChange={(e) => updateLanding("heroTitle", e.target.value)}
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Etiqueta superior</span>
                        <input
                          className="input"
                          placeholder="Matrimonio · 2026"
                          value={selected.landing_config.heroEyebrow}
                          onChange={(e) => updateLanding("heroEyebrow", e.target.value)}
                        />
                      </label>
                    </div>

                    <label style={s.field}>
                      <span className="label">Subtítulo del hero</span>
                      <textarea
                        className="textarea"
                        rows={2}
                        placeholder="Captura el momento y míralo en la pantalla grande..."
                        value={selected.landing_config.heroSubtitle}
                        onChange={(e) => updateLanding("heroSubtitle", e.target.value)}
                      />
                    </label>

                    <label style={s.field}>
                      <span className="label">Párrafo de introducción</span>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={selected.landing_config.introCopy}
                        onChange={(e) => updateLanding("introCopy", e.target.value)}
                      />
                    </label>

                    <div style={s.field}>
                      <span className="label">Secciones visibles</span>
                      <div style={s.sectionChips}>
                        {(["hero", "ctas", "how-it-works", "gallery", "privacy", "event-info", "support"] as const).map((sec) => {
                          const active = selected.landing_config.sections.includes(sec);
                          return (
                            <button key={sec} type="button"
                              style={active ? s.chipActive : s.chip}
                              onClick={() => updateLanding("sections", active
                                ? selected.landing_config.sections.filter((x) => x !== sec)
                                : [...selected.landing_config.sections, sec]
                              )}
                            >
                              {sectionLabels[sec] ?? sec}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── 6. MARCA DE AGUA ───────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Marca de agua <span style={s.optionalTag}>opcional</span></span>
                      <p style={s.sectionDesc}>Tu logo impreso en cada foto que suban los invitados. PNG con fondo transparente.</p>
                    </div>

                    {selected.landing_config.watermarkUrl ? (
                      <div style={s.wmPreviewRow}>
                        <div style={s.wmPreviewBox}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={selected.landing_config.watermarkUrl} alt="Marca de agua" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button className="btn btn-secondary" style={s.wmBtn} type="button" onClick={() => watermarkInputRef.current?.click()} disabled={watermarkUploading}>
                            {watermarkUploading ? "Subiendo…" : "Cambiar imagen"}
                          </button>
                          <button className="btn btn-ghost" style={s.wmBtn} type="button" onClick={() => updateLanding("watermarkUrl", null)}>
                            Quitar marca
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ width: "100%", padding: "18px 0", borderRadius: 16, border: "1.5px dashed rgba(0,0,0,0.15)" }}
                        type="button"
                        onClick={() => watermarkInputRef.current?.click()}
                        disabled={watermarkUploading}
                      >
                        {watermarkUploading ? "Subiendo…" : "+ Subir imagen de marca de agua"}
                      </button>
                    )}

                    <input ref={watermarkInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWatermark(f); e.target.value = ""; }}
                    />

                    {selected.landing_config.watermarkUrl && (
                      <>
                        <div style={s.field}>
                          <span className="label">Posición</span>
                          <div style={s.wmCornerGrid}>
                            {(["top-left", "top-right", "bottom-left", "bottom-right"] as WatermarkPosition[]).map((pos) => {
                              const labels: Record<WatermarkPosition, string> = {
                                "top-left": "↖ Sup. izq.", "top-right": "↗ Sup. der.",
                                "bottom-left": "↙ Inf. izq.", "bottom-right": "↘ Inf. der.",
                              };
                              const active = (selected.landing_config.watermarkPosition ?? "bottom-right") === pos;
                              return (
                                <button key={pos} type="button" onClick={() => updateLanding("watermarkPosition", pos)} style={active ? s.wmCornerActive : s.wmCorner}>
                                  {labels[pos]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label style={s.field}>
                          <span className="label">Tamaño — <strong>{selected.landing_config.watermarkSize ?? 18}%</strong> del ancho</span>
                          <input type="range" min={5} max={40} step={1} value={selected.landing_config.watermarkSize ?? 18} onChange={(e) => updateLanding("watermarkSize", Number(e.target.value))} style={{ width: "100%", accentColor: "#111" }} />
                          <div style={s.sliderLabels}><span>5%</span><span>40%</span></div>
                        </label>
                        <label style={s.field}>
                          <span className="label">Opacidad — <strong>{Math.round((selected.landing_config.watermarkOpacity ?? 0.75) * 100)}%</strong></span>
                          <input type="range" min={10} max={100} step={5} value={Math.round((selected.landing_config.watermarkOpacity ?? 0.75) * 100)} onChange={(e) => updateLanding("watermarkOpacity", Number(e.target.value) / 100)} style={{ width: "100%", accentColor: "#111" }} />
                          <div style={s.sliderLabels}><span>10%</span><span>100%</span></div>
                        </label>
                      </>
                    )}
                  </div>

                  {/* ── 7. RESPONSABLE ─────────────────────────────────────── */}
                  <div style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Responsable del evento</span>
                      <p style={s.sectionDesc}>La persona que puede editar este evento desde el panel.</p>
                    </div>
                    {isSuperAdmin ? (
                      <>
                        <label style={s.field}>
                          <span className="label">Correo electrónico</span>
                          <input
                            className="input"
                            type="email"
                            placeholder="responsable@ejemplo.com"
                            value={selected.owner_email ?? userEmail}
                            onChange={(e) => updateSelected("owner_email", e.target.value)}
                          />
                          <span style={s.fieldHint}>
                            Esta persona podrá iniciar sesión en /admin y editar la landing de este evento.
                          </span>
                        </label>
                        <div style={s.responsableTip}>
                          <strong style={{ fontSize: 13 }}>¿Aún no tiene cuenta?</strong>
                          <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55 }}>
                            Pídele que se registre en <strong>{siteUrl("/auth")}</strong> con ese correo.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div style={s.responsableReadOnly}>
                        <span className="label" style={{ marginBottom: 4 }}>Correo electrónico</span>
                        <span style={s.responsableEmail}>{selected.owner_email ?? userEmail}</span>
                        <span style={s.fieldHint}>Este es tu correo. Este evento es tuyo.</span>
                      </div>
                    )}
                  </div>

                  {/* ── ZONA DE PELIGRO ────────────────────────────────────── */}
                  <div className="admin-danger-zone" style={s.dangerZone}>
                    <div>
                      <strong style={{ fontSize: 14 }}>Eliminar evento</strong>
                      <p className="muted" style={s.dangerText}>
                        Se eliminan el evento, todas sus fotos y los archivos. Irreversible.
                      </p>
                    </div>
                    <button type="button" style={s.dangerBtn} onClick={() => setConfirmDeleteEvent(true)}>
                      Eliminar evento
                    </button>
                  </div>
                </div>

                {/* Right: QR preview */}
                <div className="admin-preview-col" style={s.previewCol}>
                  <div className="card" style={s.previewCard}>
                    <span className="eyebrow">Vista rápida</span>

                    <div style={s.urlBox}>
                      <span style={s.urlText}>
                        {siteUrl(`/event/${selected.slug || "tu-slug"}`)}
                      </span>
                      <button type="button" style={s.copyBtn} onClick={copyUrl}>
                        {copyDone ? "¡Copiada!" : "Copiar"}
                      </button>
                    </div>

                    {selected.slug ? (
                      <>
                        <div style={s.qrWrap}>
                          <QRCodeCanvas
                            id="admin-qr-canvas"
                            value={siteUrl(`/event/${selected.slug}`)}
                            size={196}
                            fgColor="#111111"
                            bgColor="#ffffff"
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: "100%", fontSize: 14, padding: "12px" }}
                          onClick={downloadQR}
                        >
                          Descargar QR
                        </button>
                      </>
                    ) : (
                      <div style={s.qrPlaceholder}>
                        <span className="muted" style={{ fontSize: 13 }}>
                          El QR aparece cuando guardas el slug.
                        </span>
                      </div>
                    )}

                    <div style={s.statsList}>
                      <div style={s.statRow}>
                        <span className="muted" style={s.statLabel}>
                          Moderación
                        </span>
                        <strong style={s.statValue}>
                          {selected.moderation_mode === "auto" ? "Automática" : "Manual"}
                        </strong>
                      </div>
                      <div style={s.statRow}>
                        <span className="muted" style={s.statLabel}>
                          Límite foto
                        </span>
                        <strong style={s.statValue}>
                          {formatBytes(selected.max_upload_mb * 1024 * 1024)}
                        </strong>
                      </div>
                      {selected.event_date && (
                        <div style={s.statRow}>
                          <span className="muted" style={s.statLabel}>
                            Fecha
                          </span>
                          <strong style={s.statValue}>{formatDate(selected.event_date)}</strong>
                        </div>
                      )}
                      {selected.venue_name && (
                        <div style={s.statRow}>
                          <span className="muted" style={s.statLabel}>
                            Lugar
                          </span>
                          <strong style={s.statValue}>
                            {selected.venue_name}
                            {selected.venue_city ? `, ${selected.venue_city}` : ""}
                          </strong>
                        </div>
                      )}
                      {selected.owner_email && (
                        <div style={s.statRow}>
                          <span className="muted" style={s.statLabel}>
                            Responsable
                          </span>
                          <strong style={{ ...s.statValue, wordBreak: "break-all" }}>
                            {selected.owner_email}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FOTOS TAB ── */}
            {tab === "fotos" && (
              <div style={s.photosPanel}>
                {/* Filter bar */}
                <div style={s.filterBar}>
                  {(
                    [
                      { key: "all", label: "Todas" },
                      { key: "pending", label: "Pendientes" },
                      { key: "approved", label: "Aprobadas" },
                      { key: "rejected", label: "Rechazadas" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      style={photoFilter === key ? s.filterActive : s.filterBtn}
                      onClick={() => setPhotoFilter(key)}
                    >
                      {label}
                      <span
                        style={{
                          ...s.filterCount,
                          ...(photoFilter === key ? s.filterCountActive : {}),
                          ...(key === "pending" && photoCounts.pending > 0
                            ? s.filterCountPending
                            : {}),
                        }}
                      >
                        {photoCounts[key]}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    style={s.refreshBtn}
                    onClick={() => loadPhotos(selected.id)}
                    disabled={photosLoading}
                  >
                    {photosLoading ? "Cargando..." : "↺ Actualizar"}
                  </button>
                </div>

                {/* Export toolbar */}
                {filteredPhotos.length > 0 && (
                  <div style={s.exportBar}>
                    {/* Select mode toggle */}
                    <button
                      type="button"
                      style={selectMode ? s.exportBtnActive : s.exportBtn}
                      onClick={() => {
                        setSelectMode((v) => !v);
                        setSelectedPhotoIds(new Set());
                      }}
                    >
                      {selectMode ? "Cancelar selección" : "Seleccionar"}
                    </button>

                    {selectMode && (
                      <>
                        <button
                          type="button"
                          style={s.exportBtn}
                          onClick={() => {
                            if (selectedPhotoIds.size === filteredPhotos.length) {
                              setSelectedPhotoIds(new Set());
                            } else {
                              setSelectedPhotoIds(new Set(filteredPhotos.map((p) => p.id)));
                            }
                          }}
                        >
                          {selectedPhotoIds.size === filteredPhotos.length
                            ? "Deseleccionar todas"
                            : "Seleccionar todas"}
                        </button>

                        {selectedPhotoIds.size > 0 && (
                          <button
                            type="button"
                            style={s.exportBtnPrimary}
                            disabled={!!exportState}
                            onClick={() => exportPhotos([...selectedPhotoIds])}
                          >
                            {exportState
                              ? `Exportando ${exportState.done}/${exportState.total}…`
                              : `↓ Exportar ${selectedPhotoIds.size} foto${selectedPhotoIds.size > 1 ? "s" : ""}`}
                          </button>
                        )}
                      </>
                    )}

                    {/* Always available: export all visible */}
                    {!selectMode && (
                      <button
                        type="button"
                        style={s.exportBtnPrimary}
                        disabled={!!exportState}
                        onClick={() => exportPhotos(filteredPhotos.map((p) => p.id))}
                      >
                        {exportState
                          ? `Exportando ${exportState.done}/${exportState.total}…`
                          : `↓ Exportar ${filteredPhotos.length === photos.length ? "todas" : filteredPhotos.length} (ZIP)`}
                      </button>
                    )}
                  </div>
                )}

                {/* Grid */}
                {photosLoading ? (
                  <div style={s.centerState}>
                    <p className="muted">Cargando fotos...</p>
                  </div>
                ) : filteredPhotos.length === 0 ? (
                  <div style={s.emptyPhotos}>
                    <strong>
                      {photoFilter === "all"
                        ? "No hay fotos todavía"
                        : `Sin fotos con estado "${photoFilter}"`}
                    </strong>
                    <p className="muted" style={s.emptyText}>
                      {photoFilter === "pending"
                        ? "Cuando los invitados suban fotos en modo manual, aparecerán aquí para aprobar o rechazar."
                        : "Las fotos aparecerán aquí cuando los invitados comiencen a subir."}
                    </p>
                  </div>
                ) : (
                  <div className="admin-photo-grid" style={s.photoGrid}>
                    {filteredPhotos.map((photo) => {
                      const cfg = STATUS_CFG[photo.moderation_status] ?? STATUS_CFG.pending;
                      const confirming = deletingPhotoId === photo.id;
                      const isSelected = selectedPhotoIds.has(photo.id);
                      return (
                        <div
                          key={photo.id}
                          className="card"
                          style={{
                            ...s.photoCard,
                            outline: isSelected ? "2.5px solid #111" : "none",
                            outlineOffset: 2,
                          }}
                          onClick={selectMode ? () => {
                            setSelectedPhotoIds((cur) => {
                              const next = new Set(cur);
                              if (next.has(photo.id)) { next.delete(photo.id); } else { next.add(photo.id); }
                              return next;
                            });
                          } : undefined}
                        >
                          <div style={s.photoImgWrap}>
                            <Image
                              src={publicStorageUrl(photo.storage_path)}
                              alt="Foto del evento"
                              fill
                              sizes="(max-width: 1400px) 25vw, 20vw"
                              style={{ objectFit: "cover" }}
                              unoptimized
                            />
                            <div
                              style={{
                                ...s.statusBadge,
                                background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </div>
                            {/* Selection checkbox */}
                            {selectMode && (
                              <div style={{
                                ...s.selectionCheck,
                                background: isSelected ? "#111" : "rgba(255,255,255,0.85)",
                                border: isSelected ? "2px solid #111" : "2px solid rgba(0,0,0,0.2)",
                              }}>
                                {isSelected && (
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={s.photoMeta}>
                            <strong style={s.photoAuthor}>
                              {photo.is_anonymous
                                ? "Anónimo"
                                : photo.uploaded_by_name || "Invitado"}
                            </strong>
                            <span className="muted" style={s.photoTime}>
                              {new Date(photo.created_at).toLocaleString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                            {photo.filter_name && photo.filter_name !== "none" && (
                              <span className="pill" style={s.filterPill}>
                                {photo.filter_name}
                              </span>
                            )}
                          </div>

                          <div style={s.photoActions}>
                            {confirming ? (
                              <>
                                <span style={s.confirmText}>¿Eliminar esta foto?</span>
                                <button
                                  type="button"
                                  style={s.actionDanger}
                                  onClick={() => deletePhoto(photo.id)}
                                >
                                  Eliminar
                                </button>
                                <button
                                  type="button"
                                  style={s.actionNeutral}
                                  onClick={() => setDeletingPhotoId(null)}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {photo.moderation_status !== "approved" && (
                                  <button
                                    type="button"
                                    style={s.actionApprove}
                                    onClick={() => moderatePhoto(photo.id, "approved")}
                                  >
                                    Aprobar
                                  </button>
                                )}
                                {photo.moderation_status !== "rejected" && (
                                  <button
                                    type="button"
                                    style={s.actionReject}
                                    onClick={() => moderatePhoto(photo.id, "rejected")}
                                  >
                                    Rechazar
                                  </button>
                                )}
                                {photo.moderation_status === "approved" && (
                                  <button
                                    type="button"
                                    style={s.actionNeutral}
                                    onClick={() => moderatePhoto(photo.id, "pending")}
                                  >
                                    Despublicar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  style={{
                                    ...s.actionNeutral,
                                    marginLeft: "auto",
                                    color: "#dc2626",
                                  }}
                                  onClick={() => setDeletingPhotoId(photo.id)}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* ── Confirm delete event modal ── */}
      {confirmDeleteEvent && (
        <div style={s.modalOverlay}>
          <div className="card" style={s.modal}>
            <h3 className="serif" style={s.modalTitle}>
              ¿Eliminar &ldquo;{selected.title}&rdquo;?
            </h3>
            <p className="muted" style={s.modalBody}>
              Se eliminarán el evento, todas las fotos subidas y todos los archivos de
              almacenamiento. Esta acción es permanente e irreversible.
            </p>
            <div style={s.modalActions}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmDeleteEvent(false)}
                disabled={deletingEvent}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={s.modalDangerBtn}
                onClick={deleteEvent}
                disabled={deletingEvent}
              >
                {deletingEvent ? "Eliminando..." : "Sí, eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DisplayIcon ─────────────────────────────────────────────────────────────

function DisplayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <polygon points="10,8 16,11 10,14" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ─── HamburgerIcon ───────────────────────────────────────────────────────────

function HamburgerIcon({ open }: { open: boolean }) {
  const bar: React.CSSProperties = {
    display: "block",
    width: 18,
    height: 2,
    borderRadius: 2,
    background: "var(--text)",
    transition: "transform 220ms ease, opacity 220ms ease",
  };
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, width: 18 }}>
      <span style={{ ...bar, transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
      <span style={{ ...bar, opacity: open ? 0 : 1 }} />
      <span style={{ ...bar, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }} />
    </span>
  );
}

// ─── TemplateMiniPreview ─────────────────────────────────────────────────────

function TemplateMiniPreview({ theme }: { theme: LandingTemplatePreset["theme"] }) {
  const isLight = (() => {
    const h = theme.background.replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 80;
  })();

  return (
    <div style={{ width: "100%", height: 84, borderRadius: 8, overflow: "hidden", background: theme.background, position: "relative", flexShrink: 0 }}>
      {/* Hero gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${theme.background}00 0%, ${theme.background}cc 100%)` }} />
      {/* Simulated hero title bars */}
      <div style={{ position: "absolute", top: 16, left: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ width: "45%", height: 5, borderRadius: 3, background: isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.8)" }} />
        <div style={{ width: "70%", height: 9, borderRadius: 4, background: isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.95)" }} />
        <div style={{ width: "55%", height: 4, borderRadius: 3, background: isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.45)" }} />
      </div>
      {/* Accent line */}
      <div style={{ position: "absolute", bottom: 16, left: 10, width: 28, height: 4, borderRadius: 2, background: theme.accent, opacity: 0.85 }} />
      {/* Surface block */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 18, background: theme.surface }} />
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
    background: "#f5f5f7",
  },
  header: {
    height: 56,
    position: "sticky",
    top: 0,
    zIndex: 40,
    flexShrink: 0,
    background: "rgba(245,245,247,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    height: 56,
  },
  headerBrand: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  headerTitle: { fontSize: 15, letterSpacing: "-0.02em" },
  adminPill: { fontSize: 11, padding: "3px 10px" },
  headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  headerEmail: { fontSize: 13, color: "var(--muted)" },
  headerBtn: { fontSize: 13, padding: "7px 14px" },
  hamburger: {
    display: "none", // shown via CSS on mobile
    width: 38,
    height: 38,
    borderRadius: 999,
    background: "transparent",
    border: "1px solid rgba(0,0,0,0.08)",
    cursor: "pointer",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  drawerBackdrop: {
    position: "fixed",
    inset: "56px 0 0 0",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(4px)",
    zIndex: 29,
  },

  body: { flex: 1, display: "flex", alignItems: "flex-start" },

  sidebar: {
    width: 264,
    flexShrink: 0,
    position: "sticky",
    top: 56,
    height: "calc(100dvh - 56px)",
    overflowY: "auto",
    background: "#ffffff",
    borderRight: "1px solid rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "16px 12px",
    gap: 4,
  },
  sidebarBottom: {
    paddingTop: 12,
    borderTop: "1px solid rgba(0,0,0,0.07)",
    marginTop: "auto",
  },
  createBtn: { width: "100%", fontSize: 13, padding: "10px 16px", marginBottom: 8 },
  systemBtn: {
    width: "100%",
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: 12,
    background: "rgba(124,58,237,0.06)",
    border: "1px solid rgba(124,58,237,0.15)",
    color: "#6d28d9",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left" as const,
    letterSpacing: "-0.01em",
  },
  systemBtnActive: {
    width: "100%",
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: 12,
    background: "rgba(124,58,237,0.14)",
    border: "1px solid rgba(124,58,237,0.3)",
    color: "#5b21b6",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left" as const,
    letterSpacing: "-0.01em",
  },
  eventList: { display: "flex", flexDirection: "column", gap: 2 },
  eventItem: {
    padding: "10px 12px",
    borderRadius: 12,
    textAlign: "left",
    border: "none",
    background: "transparent",
    display: "grid",
    gap: 2,
    color: "var(--text)",
    cursor: "pointer",
    transition: "background 120ms ease",
  },
  eventItemActive: {
    padding: "10px 12px",
    borderRadius: 12,
    textAlign: "left",
    border: "none",
    background: "#f0f0f3",
    display: "grid",
    gap: 2,
    color: "var(--text)",
    cursor: "pointer",
  },
  eventItemTitle: { fontSize: 13, lineHeight: 1.2, letterSpacing: "-0.01em" },
  eventItemSlug: { fontSize: 11, color: "var(--muted)" },
  eventItemOwner: { fontSize: 10, color: "var(--muted-2)", wordBreak: "break-all" },
  eventItemPill: { fontSize: 11, padding: "3px 9px", marginTop: 3, width: "fit-content" },

  mainWrap: { flex: 1, padding: "28px 32px", minWidth: 0 },
  main: { maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 },

  eventHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  eventTitle: {
    fontSize: "clamp(28px, 3vw, 44px)",
    lineHeight: 0.94,
    margin: "8px 0 0",
    letterSpacing: "-0.04em",
  },
  eventHeaderActions: {
    display: "flex",
    gap: 10,
    flexShrink: 0,
    alignItems: "center",
    flexWrap: "wrap",
  },
  headerActionBtn: { fontSize: 14, padding: "10px 18px" },

  notice: { borderRadius: 16, padding: "12px 16px", fontSize: 14, lineHeight: 1.5 },
  noticeOk: {
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
  noticeErr: {
    background: "rgba(200,50,50,0.06)",
    border: "1px solid rgba(200,50,50,0.18)",
    color: "#8b1a1a",
  },

  tabBar: {
    display: "flex",
    gap: 4,
    background: "rgba(0,0,0,0.04)",
    borderRadius: 999,
    padding: 4,
    width: "fit-content",
  },
  tabActive: {
    borderRadius: 999,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#ffffff",
    color: "#111111",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabInactive: {
    borderRadius: 999,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--muted)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabBadge: {
    background: "rgba(245,158,11,0.15)",
    border: "1px solid rgba(245,158,11,0.28)",
    color: "#78350f",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
  },

  editorGrid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" },

  form: { display: "grid", gap: 14 },
  formSection: {
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid rgba(0,0,0,0.07)",
    padding: "18px 20px",
    display: "grid",
    gap: 14,
  },
  sectionHead: { display: "grid", gap: 3, marginBottom: 2 },
  sectionEyebrow: { marginBottom: 0 },
  sectionDesc: { margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, opacity: 0.7 },
  optionalTag: { fontSize: 11, fontWeight: 500, opacity: 0.45, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  field: { display: "grid", gap: 8 },
  fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldHalf: { display: "grid", gap: 8 },
  fieldHint: { fontSize: 11, color: "var(--muted)", lineHeight: 1.4, wordBreak: "break-all" },
  checkGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "var(--muted)",
    cursor: "pointer",
    userSelect: "none" as const,
  },
  inputDisabled: { opacity: 0.55, cursor: "not-allowed" },

  // Responsable section
  responsableHeader: { display: "flex", alignItems: "center", gap: 10 },
  responsablePill: {
    fontSize: 11,
    padding: "3px 10px",
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.2)",
    color: "#1e40af",
  },
  responsableTip: {
    background: "rgba(59,130,246,0.04)",
    border: "1px solid rgba(59,130,246,0.12)",
    borderRadius: 16,
    padding: "12px 14px",
    color: "var(--text)",
  },
  responsableReadOnly: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: "12px 14px",
    borderRadius: 16,
    background: "var(--surface)",
    border: "1px solid var(--border)",
  },
  responsableEmail: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    wordBreak: "break-all" as const,
  },

  colorPickerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#ffffff",
  },
  colorInput: { width: 34, height: 34, border: "none", borderRadius: 8, cursor: "pointer", padding: 0, background: "none" },
  colorHex: { fontSize: 13, color: "var(--muted)", fontFamily: "monospace" },
  sectionChips: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 6 },
  chip: {
    padding: "7px 13px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  chipActive: {
    padding: "7px 13px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.18)",
    color: "#111",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerZone: {
    background: "rgba(239,68,68,0.04)",
    border: "1px solid rgba(239,68,68,0.14)",
    borderRadius: 20,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  dangerText: { margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 },

  // Watermark
  wmPreviewRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  wmPreviewBox: {
    width: 120,
    height: 80,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 0 0 / 12px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  wmBtn: { fontSize: 13, padding: "8px 14px" },
  wmCornerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 4,
  },
  wmCorner: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  wmCornerActive: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.25)",
    background: "#111",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "var(--muted)",
    marginTop: 4,
  },
  // Filter/template mode chips
  modeChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  modeChip: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  modeChipActive: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.5)",
    background: "#111111",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  filterGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  filterChip: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--muted)",
    fontSize: 13,
    cursor: "pointer",
  },
  filterChipActive: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(212,163,115,0.7)",
    background: "rgba(212,163,115,0.12)",
    color: "#111",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "9px 16px",
    borderRadius: 999,
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  // Export toolbar
  exportBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
    padding: "10px 0 2px",
  },
  exportBtn: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "transparent",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  exportBtnActive: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.5)",
    background: "rgba(0,0,0,0.06)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  exportBtnPrimary: {
    padding: "8px 18px",
    borderRadius: 999,
    border: "none",
    background: "#111111",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    marginLeft: "auto",
  },

  // Selection checkbox overlay on photo card
  selectionCheck: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 150ms ease, border 150ms ease",
    zIndex: 5,
    cursor: "pointer",
  },

  previewCol: { position: "sticky", top: 0, alignSelf: "start" },
  previewCard: { padding: 20, display: "grid", gap: 16, background: "#ffffff", borderRadius: 24 },
  urlBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "rgba(0,0,0,0.03)",
    borderRadius: 14,
    padding: "10px 12px",
  },
  urlText: { fontSize: 11, color: "var(--muted)", wordBreak: "break-all", flex: 1, lineHeight: 1.4 },
  copyBtn: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.05)",
    border: "1px solid rgba(0,0,0,0.08)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    color: "var(--text)",
    flexShrink: 0,
  },
  qrWrap: {
    display: "flex",
    justifyContent: "center",
    padding: 14,
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.07)",
  },
  qrPlaceholder: { padding: "28px 16px", textAlign: "center", borderRadius: 18, border: "1px dashed rgba(0,0,0,0.12)" },
  statsList: { display: "grid", gap: 10 },
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13 },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 13, letterSpacing: "-0.02em" },

  photosPanel: { display: "grid", gap: 16 },
  filterBar: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    background: "#ffffff",
    borderRadius: 20,
    border: "1px solid rgba(0,0,0,0.07)",
    padding: "10px 14px",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterActive: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.05)",
    color: "#111",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  filterCount: { background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  filterCountActive: { background: "rgba(0,0,0,0.12)" },
  filterCountPending: { background: "rgba(245,158,11,0.15)", color: "#78350f" },
  refreshBtn: {
    marginLeft: "auto",
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  centerState: { padding: "52px 0", textAlign: "center" },
  emptyPhotos: {
    padding: "36px 24px",
    textAlign: "center",
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid rgba(0,0,0,0.07)",
    display: "grid",
    gap: 10,
  },
  emptyText: { margin: 0, lineHeight: 1.65, maxWidth: 440, justifySelf: "center", fontSize: 14 },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 },
  photoCard: { overflow: "hidden", background: "#ffffff", borderRadius: 22, display: "flex", flexDirection: "column" },
  photoImgWrap: {
    position: "relative",
    width: "100%",
    height: 200,
    background: "rgba(0,0,0,0.04)",
    overflow: "hidden",
    flexShrink: 0,
  },
  statusBadge: { position: "absolute", top: 8, right: 8, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 700, zIndex: 1 },
  photoMeta: { padding: "11px 13px 8px", display: "grid", gap: 3, borderBottom: "1px solid rgba(0,0,0,0.06)" },
  photoAuthor: { fontSize: 13, lineHeight: 1.2 },
  photoTime: { fontSize: 11 },
  filterPill: { fontSize: 10, padding: "2px 8px", marginTop: 2, width: "fit-content" },
  photoActions: { padding: "9px 12px", display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" },
  confirmText: { fontSize: 12, color: "#7f1d1d", fontWeight: 600, flex: 1 },
  actionApprove: {
    padding: "5px 11px",
    borderRadius: 999,
    border: "1px solid rgba(16,185,129,0.3)",
    background: "rgba(16,185,129,0.1)",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionReject: {
    padding: "5px 11px",
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.28)",
    background: "rgba(239,68,68,0.07)",
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionDanger: {
    padding: "5px 11px",
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.4)",
    background: "rgba(239,68,68,0.08)",
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionNeutral: {
    padding: "5px 11px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.48)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 200,
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  modal: {
    width: "min(440px, 100%)",
    padding: "28px 28px 24px",
    background: "#ffffff",
    borderRadius: 28,
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
  },
  modalTitle: { fontSize: 26, lineHeight: 1.08, margin: 0, letterSpacing: "-0.04em" },
  modalBody: { margin: "14px 0 0", lineHeight: 1.65, fontSize: 15 },
  modalActions: { display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" },
  modalDangerBtn: {
    padding: "12px 20px",
    borderRadius: 999,
    background: "#dc2626",
    border: "none",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  // Template picker
  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 8,
    marginTop: 4,
  },
  templateCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    borderRadius: 10,
    textAlign: "left" as const,
    transition: "transform 120ms ease",
  },
  templateLabel: {
    fontSize: 11,
    letterSpacing: "0.01em",
    paddingLeft: 2,
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
