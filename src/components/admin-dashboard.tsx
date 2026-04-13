"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  APP_NAME,
  DEFAULT_LANDING_CONFIG,
  EVENT_TYPES,
  eventTypePresetFromKey,
} from "@/lib/constants";
import { formatBytes, formatDate, publicStorageUrl, siteUrl, toSlug } from "@/lib/utils";
import type { EventRecord, EventTypeKey, PhotoRecord } from "@/types";

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

  // Photo management
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "all"
  );
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Saving / deleting
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);

  // Feedback
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [copyDone, setCopyDone] = useState(false);

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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerBrand}>
          <strong style={s.headerTitle}>{APP_NAME}</strong>
          <span className="pill" style={s.adminPill}>
            {isSuperAdmin ? "Super admin" : "Panel admin"}
          </span>
        </div>
        <div style={s.headerRight}>
          <span style={s.headerEmail}>{userEmail}</span>
          <button className="btn btn-ghost" style={s.headerBtn} onClick={signOut} type="button">
            Salir
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={s.body}>
        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
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
        </aside>

        {/* ── Main ── */}
        <div style={s.mainWrap}>
          <div style={s.main}>
            {/* Event header */}
            <div style={s.eventHeader}>
              <div>
                <span className="eyebrow">
                  {eventTypePresetFromKey(selected.event_type_key).name}
                </span>
                <h1 className="serif" style={s.eventTitle}>
                  {selected.title || "Nuevo evento"}
                </h1>
              </div>
              <div style={s.eventHeaderActions}>
                {selected.slug && (
                  <a
                    className="btn btn-secondary"
                    href={siteUrl(`/event/${selected.slug}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.headerActionBtn}
                  >
                    Abrir landing ↗
                  </a>
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
              <div style={s.editorGrid}>
                {/* Left: form */}
                <div style={s.form}>
                  {/* Identidad */}
                  <div style={s.formSection}>
                    <span className="eyebrow" style={s.sectionEyebrow}>
                      Identidad del evento
                    </span>

                    <label style={s.field}>
                      <span className="label">Tipo de evento</span>
                      <select
                        className="select"
                        value={selected.event_type_key}
                        onChange={(e) => applyPreset(e.target.value as EventTypeKey)}
                      >
                        {EVENT_TYPES.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Título del evento</span>
                        <input
                          className="input"
                          placeholder="Boda de Laura &amp; Mateo"
                          value={selected.title}
                          onChange={(e) => updateSelected("title", e.target.value)}
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Subtítulo</span>
                        <input
                          className="input"
                          placeholder="Un día para recordar"
                          value={selected.subtitle ?? ""}
                          onChange={(e) => updateSelected("subtitle", e.target.value)}
                        />
                      </label>
                    </div>

                    {/* Slug — allow dashes while typing; strip trailing on blur */}
                    <label style={s.field}>
                      <span className="label">Slug (URL del evento)</span>
                      <input
                        className="input"
                        placeholder="boda-laura-mateo-2026"
                        value={selected.slug}
                        onChange={(e) =>
                          updateSelected("slug", sanitizeSlugInput(e.target.value))
                        }
                        onBlur={(e) =>
                          updateSelected("slug", toSlug(e.target.value))
                        }
                      />
                      <span style={s.fieldHint}>
                        {siteUrl(`/event/${selected.slug || "tu-slug"}`)}
                      </span>
                    </label>

                    <div style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Fecha del evento</span>
                        <input
                          className="input"
                          type="date"
                          value={selected.event_date ? selected.event_date.slice(0, 10) : ""}
                          onChange={(e) =>
                            updateSelected(
                              "event_date",
                              e.target.value ? new Date(e.target.value).toISOString() : null
                            )
                          }
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Ciudad</span>
                        <input
                          className="input"
                          placeholder="Bogotá"
                          value={selected.venue_city ?? ""}
                          onChange={(e) => updateSelected("venue_city", e.target.value)}
                        />
                      </label>
                    </div>

                    <label style={s.field}>
                      <span className="label">Lugar / Venue</span>
                      <input
                        className="input"
                        placeholder="Club El Nogal"
                        value={selected.venue_name ?? ""}
                        onChange={(e) => updateSelected("venue_name", e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Responsable */}
                  <div style={s.formSection}>
                    <div style={s.responsableHeader}>
                      <span className="eyebrow">Responsable del evento</span>
                      <span className="pill" style={s.responsablePill}>
                        Acceso a edición
                      </span>
                    </div>

                    <label style={s.field}>
                      <span className="label">Correo electrónico del responsable</span>
                      <input
                        className="input"
                        type="email"
                        placeholder="responsable@ejemplo.com"
                        value={selected.owner_email ?? userEmail}
                        onChange={(e) => updateSelected("owner_email", e.target.value)}
                        disabled={!isSuperAdmin}
                        style={!isSuperAdmin ? s.inputDisabled : undefined}
                      />
                      <span style={s.fieldHint}>
                        {isSuperAdmin
                          ? "Esta persona podrá iniciar sesión en /admin y editar la landing de este evento."
                          : "El responsable eres tú. Solo un super admin puede reasignar eventos."}
                      </span>
                    </label>

                    {isSuperAdmin && (
                      <div style={s.responsableTip}>
                        <strong style={{ fontSize: 13 }}>¿El responsable aún no tiene cuenta?</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55 }}>
                          Pídele que se registre en{" "}
                          <strong>{siteUrl("/auth")}</strong> con ese correo. Al iniciar sesión
                          verá este evento en su panel y podrá editarlo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subida de fotos */}
                  <div style={s.formSection}>
                    <span className="eyebrow" style={s.sectionEyebrow}>
                      Subida de fotos
                    </span>

                    <div style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Moderación</span>
                        <select
                          className="select"
                          value={selected.moderation_mode}
                          onChange={(e) =>
                            updateSelected(
                              "moderation_mode",
                              e.target.value as EventRecord["moderation_mode"]
                            )
                          }
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

                    <div style={s.checkGrid}>
                      <label style={s.checkRow}>
                        <input
                          type="checkbox"
                          checked={selected.allow_guest_upload}
                          onChange={(e) => updateSelected("allow_guest_upload", e.target.checked)}
                        />
                        <span>Permitir subida a invitados</span>
                      </label>
                      <label style={s.checkRow}>
                        <input
                          type="checkbox"
                          checked={selected.landing_config.showNameField}
                          onChange={(e) => updateLanding("showNameField", e.target.checked)}
                        />
                        <span>Pedir nombre al invitado</span>
                      </label>
                      <label style={s.checkRow}>
                        <input
                          type="checkbox"
                          checked={selected.landing_config.showAnonymousToggle}
                          onChange={(e) => updateLanding("showAnonymousToggle", e.target.checked)}
                        />
                        <span>Mostrar opción anónima</span>
                      </label>
                      <label style={s.checkRow}>
                        <input
                          type="checkbox"
                          checked={selected.landing_config.showTerms}
                          onChange={(e) => updateLanding("showTerms", e.target.checked)}
                        />
                        <span>Mostrar términos y condiciones</span>
                      </label>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={s.formSection}>
                    <span className="eyebrow" style={s.sectionEyebrow}>
                      Contenido de la landing
                    </span>

                    <div style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Hero title</span>
                        <input
                          className="input"
                          placeholder="Boda de Laura &amp; Mateo"
                          value={selected.landing_config.heroTitle}
                          onChange={(e) => updateLanding("heroTitle", e.target.value)}
                        />
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">Eyebrow (etiqueta superior)</span>
                        <input
                          className="input"
                          placeholder="Matrimonio · 2026"
                          value={selected.landing_config.heroEyebrow}
                          onChange={(e) => updateLanding("heroEyebrow", e.target.value)}
                        />
                      </label>
                    </div>

                    <label style={s.field}>
                      <span className="label">Hero subtitle</span>
                      <textarea
                        className="textarea"
                        rows={3}
                        placeholder="Captura el momento y míralo en la pantalla grande..."
                        value={selected.landing_config.heroSubtitle}
                        onChange={(e) => updateLanding("heroSubtitle", e.target.value)}
                      />
                    </label>

                    <label style={s.field}>
                      <span className="label">Copy principal (intro)</span>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={selected.landing_config.introCopy}
                        onChange={(e) => updateLanding("introCopy", e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Apariencia */}
                  <div style={s.formSection}>
                    <span className="eyebrow" style={s.sectionEyebrow}>
                      Apariencia
                    </span>

                    <div style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Color de acento</span>
                        <div style={s.colorPickerRow}>
                          <input
                            type="color"
                            value={selected.landing_config.theme.accent}
                            onChange={(e) =>
                              updateLanding("theme", {
                                ...selected.landing_config.theme,
                                accent: e.target.value,
                              })
                            }
                            style={s.colorInput}
                          />
                          <span style={s.colorHex}>{selected.landing_config.theme.accent}</span>
                        </div>
                      </label>
                      <label style={s.fieldHalf}>
                        <span className="label">URL de imagen hero</span>
                        <input
                          className="input"
                          placeholder="https://..."
                          value={selected.landing_config.theme.heroImage ?? ""}
                          onChange={(e) =>
                            updateLanding("theme", {
                              ...selected.landing_config.theme,
                              heroImage: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <div style={s.field}>
                      <span className="label">Secciones visibles en la landing</span>
                      <div style={s.sectionChips}>
                        {(
                          [
                            "hero",
                            "ctas",
                            "how-it-works",
                            "gallery",
                            "privacy",
                            "event-info",
                            "support",
                          ] as const
                        ).map((sec) => {
                          const active = selected.landing_config.sections.includes(sec);
                          return (
                            <button
                              key={sec}
                              type="button"
                              style={active ? s.chipActive : s.chip}
                              onClick={() =>
                                updateLanding(
                                  "sections",
                                  active
                                    ? selected.landing_config.sections.filter((x) => x !== sec)
                                    : [...selected.landing_config.sections, sec]
                                )
                              }
                            >
                              {sectionLabels[sec] ?? sec}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div style={s.dangerZone}>
                    <div>
                      <strong style={{ fontSize: 14 }}>Eliminar evento</strong>
                      <p className="muted" style={s.dangerText}>
                        Se eliminan el evento, todas sus fotos y los archivos de almacenamiento.
                        Irreversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      style={s.dangerBtn}
                      onClick={() => setConfirmDeleteEvent(true)}
                    >
                      Eliminar evento
                    </button>
                  </div>
                </div>

                {/* Right: QR preview */}
                <div style={s.previewCol}>
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
                  <div style={s.photoGrid}>
                    {filteredPhotos.map((photo) => {
                      const cfg = STATUS_CFG[photo.moderation_status] ?? STATUS_CFG.pending;
                      const confirming = deletingPhotoId === photo.id;
                      return (
                        <div key={photo.id} className="card" style={s.photoCard}>
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
          </div>
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

// ─── styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#f5f5f7",
  },
  header: {
    height: 56,
    flexShrink: 0,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  headerBrand: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 15, letterSpacing: "-0.02em" },
  adminPill: { fontSize: 11, padding: "3px 10px" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  headerEmail: { fontSize: 13, color: "var(--muted)" },
  headerBtn: { fontSize: 13, padding: "7px 14px" },

  body: { flex: 1, display: "flex", overflow: "hidden" },

  sidebar: {
    width: 256,
    flexShrink: 0,
    background: "#ffffff",
    borderRight: "1px solid rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    padding: 14,
    gap: 6,
  },
  createBtn: { width: "100%", fontSize: 14, padding: "11px 16px", marginBottom: 6 },
  eventList: { display: "flex", flexDirection: "column", gap: 5 },
  eventItem: {
    padding: "11px 13px",
    borderRadius: 18,
    textAlign: "left",
    border: "1px solid rgba(0,0,0,0.06)",
    background: "transparent",
    display: "grid",
    gap: 3,
    color: "var(--text)",
    cursor: "pointer",
  },
  eventItemActive: {
    padding: "11px 13px",
    borderRadius: 18,
    textAlign: "left",
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.05)",
    display: "grid",
    gap: 3,
    color: "var(--text)",
    cursor: "pointer",
  },
  eventItemTitle: { fontSize: 13, lineHeight: 1.2, letterSpacing: "-0.01em" },
  eventItemSlug: { fontSize: 11, color: "var(--muted)" },
  eventItemOwner: { fontSize: 10, color: "var(--muted-2)", wordBreak: "break-all" },
  eventItemPill: { fontSize: 11, padding: "3px 9px", marginTop: 3, width: "fit-content" },

  mainWrap: { flex: 1, overflowY: "auto", padding: "24px 28px" },
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
  sectionEyebrow: { marginBottom: 4 },
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
};
