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
import type { CreditPricing, CreditTransaction, EventRecord, EventTypeKey, LandingTemplatePreset, PhotoRecord, WatermarkPosition } from "@/types";
import { SpyCatIcon } from "@/components/top-nav";
import { SuperAdminPanel } from "@/components/super-admin-panel";
import { CreditsPanel } from "@/components/credits-panel";

const supabase = createSupabaseBrowserClient();

// ─── helpers ────────────────────────────────────────────────────────────────

const sectionLabels: Record<string, string> = {
  hero: "Hero",
  ctas: "CTAs",
  "how-it-works": "Cómo funciona",
  gallery: "Galería",
  privacy: "Privacidad",
  "event-info": "Datos del evento",
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
  is_active: true,
  photo_limit: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Create a blank draft with theme defaults for the given event type */
function createDraftEvent(ownerEmail: string, typeKey: EventTypeKey = "matrimonio"): EventRecord {
  const preset = eventTypePresetFromKey(typeKey);
  const year = new Date().getFullYear();
  return {
    ...emptyEvent,
    id: crypto.randomUUID(),
    slug: "", // filled when createNew() resolves the available slug
    event_type_key: preset.key,
    title: "",      // user fills in their own names
    subtitle: null, // user fills in
    owner_email: ownerEmail,
    landing_config: {
      ...DEFAULT_LANDING_CONFIG,
      heroEyebrow: `${preset.name} · ${year}`,
      heroTitle: "",  // user fills in
      heroSubtitle: "",
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
  const [tab, setTab] = useState<"resumen" | "evento" | "fotos">(() =>
    initialEvents.length > 0 ? "resumen" : "evento"
  );
  const [mainView, setMainView] = useState<"editor" | "system" | "credits">("editor");

  // Credits
  const [credits, setCredits] = useState<number | null>(null);
  const [pricing, setPricing] = useState<Record<string, CreditPricing>>({});
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);

  // Track which event ids exist in DB (not drafts)
  const [savedIds] = useState<Set<string>>(() => new Set(initialEvents.map((e) => e.id)));

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
  const [bulkActionState, setBulkActionState] = useState<{ op: string; done: number; total: number } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [metaPhoto, setMetaPhoto] = useState<PhotoRecord | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoRecord | null>(null);

  // Saving / deleting
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [deletedEventInfo, setDeletedEventInfo] = useState<{
    title: string;
    nextTitle: string | null;
  } | null>(null);

  // Feedback
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string }>({});

  // Mobile sidebar drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Unsaved changes + active toggle
  const [isDirty, setIsDirty] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  // Interactive spotlight tour (-1 = inactive)
  const [tourStep, setTourStep] = useState<number>(() => {
    if (initialEvents.length > 0) return -1;
    if (typeof window === "undefined") return -1;
    return localStorage.getItem("memorica-tour-v1") ? -1 : 0;
  });
  const closeTour = useCallback(() => {
    localStorage.setItem("memorica-tour-v1", "1");
    setTourStep(-1);
  }, []);

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

  // ── credits + pricing ──────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/credits").then((r) => r.json()).then((j) => {
      if (j.ok) { setCredits(j.credits); setTransactions(j.transactions ?? []); }
    }).catch(() => {});
    fetch("/api/admin/pricing").then((r) => r.json()).then((j) => {
      if (j.ok) {
        const map: Record<string, CreditPricing> = {};
        for (const p of j.pricing) map[p.key] = p;
        setPricing(map);
      }
    }).catch(() => {});
  }, []);

  const refreshCredits = useCallback(() => {
    fetch("/api/credits").then((r) => r.json()).then((j) => {
      if (j.ok) { setCredits(j.credits); setTransactions(j.transactions ?? []); }
    }).catch(() => {});
  }, []);

  const buyPhotoPack = useCallback(async (packKey: string) => {
    setPurchasingPack(packKey);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selected.id, pack_key: packKey }),
      });
      const json = await res.json();
      if (!json.ok) { setNotice({ text: json.message, ok: false }); return; }
      setCredits(json.credits);
      setEvents((cur) => cur.map((e) => e.id === selected.id ? { ...e, photo_limit: json.photo_limit } : e));
      setNotice({ text: `Pack activado. Límite de fotos: ${json.photo_limit}`, ok: true });
      refreshCredits();
    } finally {
      setPurchasingPack(null);
    }
  }, [selected.id, refreshCredits]);

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
    if ((tab === "fotos" || tab === "resumen") && selectedId && savedIds.has(selectedId)) {
      loadPhotos(selectedId);
    }
  }, [tab, selectedId, loadPhotos, savedIds]);

  // Switch tabs when tour step changes
  useEffect(() => {
    if (tourStep < 0 || tourStep >= TOUR_STEPS_DEF.length) return;
    const step = TOUR_STEPS_DEF[tourStep];
    setMainView("editor");
    // Only switch to resumen/fotos if this event is saved
    if ((step.tab === "resumen" || step.tab === "fotos") && !savedIds.has(selectedId)) {
      // skip to next available step
      const next = TOUR_STEPS_DEF.findIndex((s, i) => i > tourStep && s.tab === "evento");
      setTourStep(next >= 0 ? next : -1);
      return;
    }
    setTab(step.tab);
  }, [tourStep]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const bulkModerate = async (ids: string[], status: "approved" | "rejected") => {
    const total = ids.length;
    setBulkActionState({ op: status, done: 0, total });
    let done = 0;
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/photos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          const json = await res.json() as { ok: boolean };
          if (json.ok) setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, moderation_status: status } : p)));
        } finally {
          done++;
          setBulkActionState({ op: status, done, total });
        }
      })
    );
    setBulkActionState(null);
    setSelectedPhotoIds(new Set());
    setNotice({ text: `${total} foto${total > 1 ? "s" : ""} ${status === "approved" ? "publicadas" : "despublicadas"}.`, ok: true });
  };

  const bulkDelete = async (ids: string[]) => {
    const total = ids.length;
    setBulkActionState({ op: "delete", done: 0, total });
    let done = 0;
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
          const json = await res.json() as { ok: boolean };
          if (json.ok) setPhotos((cur) => cur.filter((p) => p.id !== id));
        } finally {
          done++;
          setBulkActionState({ op: "delete", done, total });
        }
      })
    );
    setBulkActionState(null);
    setSelectedPhotoIds(new Set());
    setConfirmBulkDelete(false);
    setSelectMode(false);
    setNotice({ text: `${total} foto${total > 1 ? "s" : ""} eliminadas.`, ok: true });
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
      // Always start the tour when creating a new event
      setTourStep(0);
    } finally {
      setCreating(false);
    }
  };

  const saveEvent = async () => {
    const errs: { title?: string; slug?: string } = {};
    if (!selected.title.trim()) errs.title = "El nombre del evento es obligatorio.";
    if (!selected.slug.trim()) errs.slug = "La URL del evento es obligatoria.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setTab("evento");
      // Scroll to the section
      setTimeout(() => {
        document.querySelector('[data-tour="section-evento"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setNotice(null);

    const isNew = !savedIds.has(selected.id);
    const cleanSlug = toSlug(selected.slug);

    if (isNew) {
      // New event — use credit route (server-side deduction)
      const payload = {
        id: selected.id,
        slug: cleanSlug,
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
        is_active: selected.is_active,
      };
      const res = await fetch("/api/credits/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setSaving(false);
      if (!json.ok) {
        setNotice({ text: json.message, ok: false });
        return;
      }
      savedIds.add(json.event.id);
      setCredits(json.credits);
      setEvents((cur) => {
        const rest = cur.filter((e) => e.id !== json.event.id);
        return [json.event as EventRecord, ...rest];
      });
      setSelectedId(json.event.id);
      setIsDirty(false);
      setTab("resumen");
      setNotice({ text: `Evento creado. ${json.cost} crédito${json.cost !== 1 ? "s" : ""} descontado${json.cost !== 1 ? "s" : ""}. Compra un pack de fotos para activar las subidas.`, ok: true });
    } else {
      // Existing event — direct update
      const payload = {
        id: selected.id,
        slug: cleanSlug,
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
        is_active: selected.is_active,
      };
      const { data, error } = await supabase.from("events").update(payload).eq("id", selected.id).select("*").single();
      setSaving(false);
      if (error) { setNotice({ text: error.message, ok: false }); return; }
      setEvents((cur) => cur.map((e) => e.id === data.id ? data as EventRecord : e));
      setIsDirty(false);
      setNotice({ text: "Cambios guardados.", ok: true });
    }
  };

  const deleteEvent = async () => {
    if (!selected?.id) return;
    const deletedTitle = selected.title || "Evento sin título";
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
        setTab("resumen");
        setDeletedEventInfo({ title: deletedTitle, nextTitle: remaining[0].title || "Evento sin título" });
      } else {
        const draft = createDraftEvent(userEmail);
        setEvents([draft]);
        setSelectedId(draft.id);
        setTab("evento");
        setDeletedEventInfo({ title: deletedTitle, nextTitle: null });
      }
      setPhotos([]);
    } else {
      setNotice({ text: json.message ?? "Error al eliminar evento.", ok: false });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  };

  const toggleActive = async () => {
    if (!savedIds.has(selected.id)) return;
    const newValue = !selected.is_active;
    setTogglingActive(true);
    // Optimistic update (immediate, without marking form dirty)
    setEvents((cur) => cur.map((e) => (e.id === selected.id ? { ...e, is_active: newValue } : e)));
    try {
      const { error } = await supabase.from("events").update({ is_active: newValue }).eq("id", selected.id);
      if (error) throw error;
    } catch {
      // Revert on failure
      setEvents((cur) => cur.map((e) => (e.id === selected.id ? { ...e, is_active: !newValue } : e)));
      setNotice({ text: "Error al actualizar el estado del evento.", ok: false });
    } finally {
      setTogglingActive(false);
    }
  };

  // ── field helpers ──────────────────────────────────────────────────────────

  const updateSelected = <K extends keyof EventRecord>(key: K, value: EventRecord[K]) => {
    setEvents((cur) => cur.map((e) => (e.id === selected.id ? { ...e, [key]: value } : e)));
    setIsDirty(true);
    // Clear field-level errors as the user types
    if (key === "title") setFieldErrors((prev) => ({ ...prev, title: undefined }));
    if (key === "slug") setFieldErrors((prev) => ({ ...prev, slug: undefined }));
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
    setIsDirty(true);
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
              // Never overwrite the user's title/subtitle — only update visual theme
              landing_config: {
                ...e.landing_config,
                heroEyebrow: `${preset.name} · ${year}`,
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
    setIsDirty(true);
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
    const canvas = (
      document.getElementById("admin-qr-canvas") ??
      document.getElementById("admin-qr-canvas-preview")
    ) as HTMLCanvasElement | null;
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
      a.download = `${selected.slug || "fotos"}-memorica.zip`;
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
            {credits !== null && (
              <button
                type="button"
                style={{ ...s.creditsChip, cursor: "pointer" }}
                title="Ver créditos y comprar"
                onClick={() => setMainView((v) => v === "credits" ? "editor" : "credits")}
              >
                <span style={s.creditsIcon}>◈</span>
                <span style={{ fontWeight: 800 }}>{credits}</span>
                <span style={{ opacity: 0.65, fontSize: 11 }}>créditos</span>
              </button>
            )}
            <span className="admin-header-email" style={s.headerEmail}>{userEmail}</span>
            <button className="btn btn-ghost admin-header-signout" style={s.headerBtn} onClick={signOut} type="button">
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
                  setTab(savedIds.has(event.id) ? "resumen" : "evento");
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
          <div style={s.sidebarBottom}>
            <button
              type="button"
              style={mainView === "credits" ? s.creditsBtnActive : s.creditsBtn}
              onClick={() => {
                setMainView((v) => v === "credits" ? "editor" : "credits");
                setSidebarOpen(false);
              }}
            >
              {credits !== null ? `◈ ${credits} créditos` : "◈ Créditos"}
            </button>
            {isSuperAdmin && (
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
            )}
            <button
              type="button"
              className="admin-sidebar-signout"
              style={s.signOutBtn}
              onClick={signOut}
            >
              Salir
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="admin-main-wrap" style={s.mainWrap}>
          {/* ── Credits panel (all users) ── */}
          {mainView === "credits" && (
            <div style={s.main}>
              <CreditsPanel
                userEmail={userEmail}
                initialCredits={credits ?? 0}
                initialTransactions={transactions}
              />
            </div>
          )}

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
                  style={{ ...s.headerActionBtn, ...(isDirty ? {} : { opacity: 0.55 }) }}
                  type="button"
                >
                  {saving ? "Guardando..." : isDirty ? "Guardar cambios" : "Guardado ✓"}
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
              {savedIds.has(selected.id) && (
                <button
                  type="button"
                  style={tab === "resumen" ? s.tabActive : s.tabInactive}
                  onClick={() => setTab("resumen")}
                >
                  Resumen
                </button>
              )}
              <button
                type="button"
                style={tab === "evento" ? s.tabActive : s.tabInactive}
                onClick={() => setTab("evento")}
              >
                Evento
                {isDirty && <span style={s.dirtyDot} />}
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

            {/* ── RESUMEN TAB ── */}
            {tab === "resumen" && savedIds.has(selected.id) && (
              <div style={sr.panel}>

                {/* Status card */}
                <div data-tour="section-status" className="card" style={sr.statusCard}>
                  <div style={sr.statusRow}>
                    <div>
                      <span className="eyebrow" style={{ marginBottom: 4 }}>Estado del evento</span>
                      <p style={sr.statusText}>
                        {selected.is_active
                          ? "Activo — los invitados pueden ver y subir fotos."
                          : "Pausado — el evento no es visible para los invitados."}
                      </p>
                    </div>
                    <button
                      type="button"
                      style={{ ...sr.toggle, background: selected.is_active ? "#111111" : "rgba(0,0,0,0.18)" }}
                      onClick={toggleActive}
                      disabled={togglingActive}
                      aria-label={selected.is_active ? "Pausar evento" : "Activar evento"}
                    >
                      <span style={{ ...sr.toggleThumb, transform: selected.is_active ? "translateX(22px)" : "translateX(2px)" }} />
                    </button>
                  </div>
                </div>

                {/* Photo stats row */}
                <div className="admin-resumen-stats" style={sr.statsRow}>
                  <button
                    type="button"
                    style={sr.statBox}
                    onClick={() => { setTab("fotos"); setPhotoFilter("approved"); }}
                  >
                    <span style={sr.statNum}>{photoCounts.approved}</span>
                    <span style={sr.statLab}>aprobadas</span>
                  </button>
                  <button
                    type="button"
                    style={{ ...sr.statBox, ...(photoCounts.pending > 0 ? sr.statBoxWarn : {}) }}
                    onClick={() => { setTab("fotos"); setPhotoFilter("pending"); }}
                  >
                    <span style={{ ...sr.statNum, ...(photoCounts.pending > 0 ? { color: "#92400e" } : {}) }}>
                      {photoCounts.pending}
                    </span>
                    <span style={sr.statLab}>{photoCounts.pending > 0 ? "pendientes →" : "pendientes"}</span>
                  </button>
                  <button
                    type="button"
                    style={sr.statBox}
                    onClick={() => { setTab("fotos"); setPhotoFilter("rejected"); }}
                  >
                    <span style={sr.statNum}>{photoCounts.rejected}</span>
                    <span style={sr.statLab}>rechazadas</span>
                  </button>
                  <div style={{ ...sr.statBox, cursor: "default" }}>
                    <span style={{
                      ...sr.statNum,
                      ...(selected.photo_limit > 0 && photoCounts.approved >= selected.photo_limit ? { color: "#dc2626" } : {}),
                    }}>
                      {selected.photo_limit > 0
                        ? `${photoCounts.approved}/${selected.photo_limit}`
                        : "—"}
                    </span>
                    <span style={sr.statLab}>capacidad</span>
                  </div>
                </div>

                {/* Two-column: share + capacity */}
                <div className="admin-resumen-grid" style={sr.grid2}>

                  {/* Share card */}
                  <div data-tour="section-share" className="card" style={sr.shareCard}>
                    <span className="eyebrow" style={{ marginBottom: 8 }}>Comparte tu evento</span>
                    <div style={s.urlBox}>
                      <span style={{ ...s.urlText, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {siteUrl(`/event/${selected.slug}`)}
                      </span>
                      <button type="button" style={s.copyBtn} onClick={copyUrl}>
                        {copyDone ? "¡Copiada!" : "Copiar"}
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                      <QRCodeCanvas
                        id="admin-qr-canvas"
                        value={siteUrl(`/event/${selected.slug}`)}
                        size={160}
                        fgColor="#111111"
                        bgColor="#ffffff"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", fontSize: 13, padding: "10px" }}
                      onClick={downloadQR}
                    >
                      Descargar QR
                    </button>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <a
                        className="btn btn-secondary"
                        href={siteUrl(`/event/${selected.slug}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textAlign: "center" as const, fontSize: 13, padding: "10px" }}
                      >
                        Abrir landing ↗
                      </a>
                      <a
                        className="btn btn-secondary"
                        href={siteUrl(`/event/${selected.slug}/display`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textAlign: "center" as const, fontSize: 13, padding: "10px", gap: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <DisplayIcon /> Pantalla
                      </a>
                    </div>
                  </div>

                  {/* Capacity card */}
                  <div className="card" style={sr.capacityCard}>
                    <PhotoCapacityCard
                      photoLimit={selected.photo_limit ?? 0}
                      photoCount={photoCounts.approved}
                      pricing={pricing}
                      credits={credits}
                      purchasing={purchasingPack}
                      onBuy={buyPhotoPack}
                    />
                    {credits !== null && credits < 10 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: "100%", marginTop: 10, fontSize: 13, padding: "10px" }}
                        onClick={() => setMainView("credits")}
                      >
                        ◈ Comprar créditos
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ── EVENTO TAB ── */}
            {tab === "evento" && (
              <div className="admin-editor-grid" style={s.editorGrid}>
                {/* Left: form */}
                <div style={s.form}>

                  {/* ── 1. TU EVENTO ───────────────────────────────────────── */}
                  <div data-tour="section-evento" style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Tu evento</span>
                      <p style={s.sectionDesc}>Los datos básicos que identifican el evento.</p>
                    </div>

                    <label style={s.field}>
                      <span className="label">
                        Tipo de evento
                        {savedIds.has(selected.id) && !isSuperAdmin && (
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>
                            · no editable después de crear
                          </span>
                        )}
                      </span>
                      <select
                        className="select"
                        value={selected.event_type_key}
                        onChange={(e) => applyPreset(e.target.value as EventTypeKey)}
                        disabled={savedIds.has(selected.id) && !isSuperAdmin}
                      >
                        {EVENT_TYPES.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.name}</option>
                        ))}
                      </select>
                    </label>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">
                          Nombre del evento
                          <span style={s.requiredTag}>obligatorio</span>
                        </span>
                        <input
                          className="input"
                          placeholder={`Ej. ${eventTypePresetFromKey(selected.event_type_key).sampleTitle}`}
                          value={selected.title}
                          onChange={(e) => updateSelected("title", e.target.value)}
                          style={fieldErrors.title ? s.inputError : undefined}
                        />
                        {fieldErrors.title && <span style={s.fieldErrorMsg}>{fieldErrors.title}</span>}
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
                            updateSelected("event_date", e.target.value || null)
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
                      <span className="label">
                        URL del evento
                        <span style={s.requiredTag}>obligatorio</span>
                      </span>
                      <input
                        className="input"
                        placeholder="boda-laura-mateo-2026"
                        value={selected.slug}
                        onChange={(e) => updateSelected("slug", sanitizeSlugInput(e.target.value))}
                        onBlur={(e) => updateSelected("slug", toSlug(e.target.value))}
                        style={fieldErrors.slug ? s.inputError : undefined}
                      />
                      <span style={s.fieldHint}>
                        {siteUrl(`/event/${selected.slug || "tu-slug"}`)} — esta es la dirección que verán tus invitados
                      </span>
                      {fieldErrors.slug && <span style={s.fieldErrorMsg}>{fieldErrors.slug}</span>}
                    </label>
                  </div>

                  {/* ── 2. DISEÑO ──────────────────────────────────────────── */}
                  <div data-tour="section-design" style={s.formSection}>
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
                      <div style={s.fieldHalf}>
                        <span className="label">Imagen de fondo hero</span>
                        <CoverImageUpload
                          eventId={selected.id}
                          value={selected.landing_config.theme.heroImage ?? ""}
                          onChange={(url) => updateLanding("theme", { ...selected.landing_config.theme, heroImage: url })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── 3. GALERÍA ─────────────────────────────────────────── */}
                  <div data-tour="section-gallery" style={s.formSection}>
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
                  <div data-tour="section-upload" style={s.formSection}>
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
                  <div data-tour="section-texts" style={s.formSection}>
                    <div style={s.sectionHead}>
                      <span className="eyebrow" style={s.sectionEyebrow}>Textos de la landing</span>
                      <p style={s.sectionDesc}>Lo que leerán tus invitados. Se pre-rellenan al elegir el tipo de evento.</p>
                    </div>

                    <div className="admin-field-row" style={s.fieldRow}>
                      <label style={s.fieldHalf}>
                        <span className="label">Título principal</span>
                        <input
                          className="input"
                          placeholder={`Ej. ${eventTypePresetFromKey(selected.event_type_key).sampleTitle}`}
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
                        {(["hero", "ctas", "how-it-works", "gallery", "privacy", "event-info"] as const).map((sec) => {
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
                            id="admin-qr-canvas-preview"
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

                    {/* Capacity summary — buy packs from the Resumen tab */}
                    {savedIds.has(selected.id) && selected.photo_limit > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span className="eyebrow" style={{ fontSize: 10, marginBottom: 0 }}>Capacidad de fotos</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: photoCounts.approved >= selected.photo_limit ? "#dc2626" : "#111" }}>
                            {photoCounts.approved} / {selected.photo_limit}
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 999,
                            width: `${Math.min(100, (photoCounts.approved / selected.photo_limit) * 100)}%`,
                            background: photoCounts.approved >= selected.photo_limit ? "#dc2626" : photoCounts.approved / selected.photo_limit > 0.8 ? "#f59e0b" : "#111",
                            transition: "width 0.3s ease",
                          }} />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: "100%", fontSize: 12, padding: "8px", marginTop: 8 }}
                          onClick={() => setTab("resumen")}
                        >
                          + Ampliar capacidad
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── FOTOS TAB ── */}
            {tab === "fotos" && (
              <div style={s.photosPanel}>
                {/* Filter bar */}
                <div data-tour="section-filter-bar" className="admin-filter-bar" style={s.filterBar}>
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
                  <div className="admin-export-bar" style={s.exportBar}>
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
                          confirmBulkDelete ? (
                            <>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                ¿Eliminar {selectedPhotoIds.size} foto{selectedPhotoIds.size > 1 ? "s" : ""}?
                              </span>
                              <button
                                type="button"
                                style={s.exportBtnDanger}
                                disabled={!!bulkActionState}
                                onClick={() => bulkDelete([...selectedPhotoIds])}
                              >
                                {bulkActionState?.op === "delete"
                                  ? `Eliminando ${bulkActionState.done}/${bulkActionState.total}…`
                                  : "Sí, eliminar"}
                              </button>
                              <button
                                type="button"
                                style={s.exportBtn}
                                disabled={!!bulkActionState}
                                onClick={() => setConfirmBulkDelete(false)}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                style={s.exportBtnApprove}
                                disabled={!!bulkActionState}
                                onClick={() => bulkModerate([...selectedPhotoIds], "approved")}
                              >
                                {bulkActionState?.op === "approved"
                                  ? `Publicando ${bulkActionState.done}/${bulkActionState.total}…`
                                  : `✓ Publicar ${selectedPhotoIds.size}`}
                              </button>
                              <button
                                type="button"
                                style={s.exportBtn}
                                disabled={!!bulkActionState}
                                onClick={() => bulkModerate([...selectedPhotoIds], "rejected")}
                              >
                                {bulkActionState?.op === "rejected"
                                  ? `Despublicando ${bulkActionState.done}/${bulkActionState.total}…`
                                  : `✕ Despublicar ${selectedPhotoIds.size}`}
                              </button>
                              <button
                                type="button"
                                style={s.exportBtnDanger}
                                disabled={!!bulkActionState}
                                onClick={() => setConfirmBulkDelete(true)}
                              >
                                Eliminar {selectedPhotoIds.size}
                              </button>
                              <button
                                type="button"
                                style={s.exportBtnPrimary}
                                disabled={!!exportState}
                                onClick={() => exportPhotos([...selectedPhotoIds])}
                              >
                                {exportState
                                  ? `Exportando ${exportState.done}/${exportState.total}…`
                                  : `↓ Exportar ${selectedPhotoIds.size}`}
                              </button>
                            </>
                          )
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
                          <div
                            style={{ ...s.photoImgWrap, cursor: selectMode ? "pointer" : "zoom-in" }}
                            onClick={!selectMode ? () => setLightboxPhoto(photo) : undefined}
                          >
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
                            {(photo.likes_count ?? 0) > 0 && (
                              <span style={s.likesChip}>
                                ♥ {photo.likes_count}
                              </span>
                            )}
                          </div>

                          <div style={s.photoActions}>
                            {confirming ? (
                              /* ── Delete confirmation ── */
                              <>
                                <p style={s.confirmText}>¿Eliminar esta foto?</p>
                                <div style={s.actionRow}>
                                  <button
                                    type="button"
                                    style={{ ...s.actionDanger, flex: 1 }}
                                    onClick={() => deletePhoto(photo.id)}
                                  >
                                    Sí, eliminar
                                  </button>
                                  <button
                                    type="button"
                                    style={{ ...s.actionNeutral, flex: 1 }}
                                    onClick={() => setDeletingPhotoId(null)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* ── Primary moderation row ── */}
                                <div style={s.actionRow}>
                                  {photo.moderation_status !== "approved" && (
                                    <button
                                      type="button"
                                      style={{ ...s.actionApprove, flex: 1 }}
                                      onClick={() => moderatePhoto(photo.id, "approved")}
                                    >
                                      ✓ Aprobar
                                    </button>
                                  )}
                                  {photo.moderation_status !== "rejected" && (
                                    <button
                                      type="button"
                                      style={{ ...s.actionReject, flex: 1 }}
                                      onClick={() => moderatePhoto(photo.id, "rejected")}
                                    >
                                      ✕ Rechazar
                                    </button>
                                  )}
                                  {photo.moderation_status === "approved" && (
                                    <button
                                      type="button"
                                      style={{ ...s.actionNeutral, flex: 1 }}
                                      onClick={() => moderatePhoto(photo.id, "pending")}
                                    >
                                      Despublicar
                                    </button>
                                  )}
                                </div>
                                {/* ── Secondary row: info + delete ── */}
                                <div style={s.actionRow}>
                                  <button
                                    type="button"
                                    style={{ ...s.actionSecondary, flex: 1 }}
                                    onClick={() => setMetaPhoto(photo)}
                                  >
                                    Info
                                  </button>
                                  <button
                                    type="button"
                                    style={{ ...s.actionSecondaryDanger, flex: 1 }}
                                    onClick={() => setDeletingPhotoId(photo.id)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
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

      {/* ── Photo lightbox ── */}
      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}

      {/* ── Photo metadata modal ── */}
      {metaPhoto && (
        <PhotoMetadataModal photo={metaPhoto} onClose={() => setMetaPhoto(null)} />
      )}

      {/* ── Deleted event success modal ── */}
      {deletedEventInfo && (
        <div style={s.modalOverlay}>
          <div className="card" style={{ ...s.modal, maxWidth: 400 }}>
            <div style={{ fontSize: 36, textAlign: "center" as const, marginBottom: 4 }}>✓</div>
            <h3 className="serif" style={{ ...s.modalTitle, textAlign: "center" as const, fontSize: 22 }}>
              Evento eliminado
            </h3>
            <p className="muted" style={{ ...s.modalBody, textAlign: "center" as const }}>
              <strong>&ldquo;{deletedEventInfo.title}&rdquo;</strong> y todas sus fotos
              han sido eliminados permanentemente.
            </p>
            <div style={{ ...s.modalActions, justifyContent: "center", marginTop: 20 }}>
              {deletedEventInfo.nextTitle ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 14, padding: "12px 22px" }}
                  onClick={() => setDeletedEventInfo(null)}
                >
                  Ir a &ldquo;{deletedEventInfo.nextTitle}&rdquo; →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 14, padding: "12px 22px" }}
                  onClick={() => { setDeletedEventInfo(null); createNew(); }}
                >
                  + Crear nuevo evento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* ── Floating help button ── */}
      <button
        type="button"
        className="admin-help-btn"
        style={s.helpBtn}
        onClick={() => setTourStep(0)}
        aria-label="Ayuda — ver tour de funcionalidades"
        title="Ayuda"
      >
        ?
      </button>

      {/* ── Interactive spotlight tour ── */}
      {tourStep >= 0 && (
        <TourSpotlight
          steps={TOUR_STEPS_DEF}
          step={tourStep}
          onNext={() => setTourStep((s) => s + 1)}
          onPrev={() => setTourStep((s) => s - 1)}
          onClose={closeTour}
        />
      )}

    </div>
  );
}

// ─── PhotoCapacityCard ────────────────────────────────────────────────────────

const PHOTO_PACKS = [
  { key: "photos_100", photos: 100 },
  { key: "photos_200", photos: 200 },
  { key: "photos_500", photos: 500 },
] as const;

function PhotoCapacityCard({
  photoLimit,
  photoCount,
  pricing,
  credits,
  purchasing,
  onBuy,
}: {
  photoLimit: number;
  photoCount: number;
  pricing: Record<string, CreditPricing>;
  credits: number | null;
  purchasing: string | null;
  onBuy: (packKey: string) => void;
}) {
  const pct = photoLimit > 0 ? Math.min(100, (photoCount / photoLimit) * 100) : 0;
  const atLimit = photoLimit > 0 && photoCount >= photoLimit;

  return (
    <div style={cc.card}>
      <div style={cc.header}>
        <span className="eyebrow" style={{ marginBottom: 0, fontSize: 10 }}>Capacidad de fotos</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: atLimit ? "#dc2626" : "#111" }}>
          {photoCount} / {photoLimit === 0 ? "—" : photoLimit}
        </span>
      </div>

      {photoLimit > 0 && (
        <div style={cc.bar}>
          <div style={{ ...cc.barFill, width: `${pct}%`, background: atLimit ? "#dc2626" : pct > 80 ? "#f59e0b" : "#111" }} />
        </div>
      )}

      {photoLimit === 0 && (
        <p style={cc.hint}>Las subidas están desactivadas. Compra un pack para activarlas.</p>
      )}
      {atLimit && (
        <p style={{ ...cc.hint, color: "#dc2626" }}>Límite alcanzado. Compra más capacidad.</p>
      )}

      <div style={cc.packs}>
        {PHOTO_PACKS.map(({ key, photos }) => {
          const p = pricing[key];
          const cost = p?.credits ?? "…";
          const canAfford = credits !== null && typeof cost === "number" && credits >= cost;
          return (
            <button
              key={key}
              type="button"
              disabled={purchasing !== null || !canAfford}
              onClick={() => onBuy(key)}
              style={{
                ...cc.packBtn,
                opacity: (!canAfford || purchasing !== null) ? 0.5 : 1,
                cursor: !canAfford || purchasing !== null ? "not-allowed" : "pointer",
              }}
              title={!canAfford ? `Necesitas ${cost} créditos` : `+${photos} fotos por ${cost} créditos`}
            >
              <span style={cc.packPhotos}>+{photos}</span>
              <span style={cc.packLabel}>fotos</span>
              <span style={cc.packCost}>{purchasing === key ? "…" : `◈ ${cost}`}</span>
            </button>
          );
        })}
      </div>

      {credits !== null && (
        <p style={cc.balance}>Saldo actual: <strong>◈ {credits}</strong></p>
      )}
    </div>
  );
}

const cc: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  bar: { height: 5, borderRadius: 999, background: "rgba(0,0,0,0.07)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, transition: "width 0.3s ease" },
  hint: { margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 },
  packs: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 },
  packBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "10px 6px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.02)",
    transition: "background 0.15s",
  },
  packPhotos: { fontSize: 15, fontWeight: 800, color: "#111", letterSpacing: "-0.03em" },
  packLabel: { fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  packCost: { fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 2 },
  balance: { margin: 0, fontSize: 11, color: "var(--muted)", textAlign: "right" as const },
};

// ─── Resumen tab styles ───────────────────────────────────────────────────────

const sr: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    paddingBottom: 32,
  },
  statusCard: {
    padding: "18px 20px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  statusText: {
    margin: "4px 0 0",
    fontSize: 14,
    color: "var(--muted)",
    lineHeight: 1.5,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    position: "relative" as const,
    flexShrink: 0,
    transition: "background 200ms ease",
    padding: 0,
  },
  toggleThumb: {
    position: "absolute" as const,
    top: 4,
    left: 0,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
    transition: "transform 200ms ease",
    display: "block",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  statBox: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 16,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
    textDecoration: "none",
  },
  statBoxWarn: {
    background: "rgba(245,158,11,0.06)",
    border: "1px solid rgba(245,158,11,0.28)",
  },
  statNum: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111",
    lineHeight: 1,
  },
  statLab: {
    fontSize: 11,
    color: "var(--muted)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    lineHeight: 1,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    alignItems: "start",
  },
  shareCard: {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  capacityCard: {
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
};

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

// ─── CoverImageUpload ─────────────────────────────────────────────────────────

const COVER_MIN_W = 1200;
const COVER_MIN_H = 630;
const COVER_MAX_MB = 10;
const COVER_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

function CoverImageUpload({
  eventId,
  value,
  onChange,
}: {
  eventId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!COVER_ACCEPT.includes(file.type)) {
      setError("Solo se aceptan JPEG, PNG o WebP.");
      return;
    }
    if (file.size > COVER_MAX_MB * 1024 * 1024) {
      setError(`Máximo ${COVER_MAX_MB} MB.`);
      return;
    }

    // Check dimensions
    const blobUrl = URL.createObjectURL(file);
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = blobUrl;
    });
    URL.revokeObjectURL(blobUrl);

    if (dims.w < COVER_MIN_W || dims.h < COVER_MIN_H) {
      setError(`Mínimo ${COVER_MIN_W}×${COVER_MIN_H} px (subiste ${dims.w}×${dims.h} px).`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `covers/${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(EVENT_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value && (
        <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover" style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
          <button
            type="button"
            onClick={() => { onChange(""); setError(null); }}
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "none", borderRadius: 4, padding: "2px 8px",
              fontSize: 11, cursor: "pointer",
            }}
          >
            Quitar
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT.join(",")}
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: "7px 14px", borderRadius: 6, border: "1px dashed rgba(0,0,0,0.25)",
          background: "#fafafa", fontSize: 12, cursor: uploading ? "not-allowed" : "pointer",
          color: "var(--muted)", fontWeight: 500,
        }}
      >
        {uploading ? "Subiendo…" : value ? "Cambiar imagen" : "Subir imagen de fondo"}
      </button>

      <span style={{ fontSize: 10, color: "var(--muted)" }}>
        Mín. {COVER_MIN_W}×{COVER_MIN_H} px · Máx. {COVER_MAX_MB} MB · JPEG / PNG / WebP
      </span>

      {error && (
        <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}

// ─── PhotoLightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({ photo, onClose }: { photo: PhotoRecord; onClose: () => void }) {
  const src = publicStorageUrl(photo.storage_path);
  const author = photo.is_anonymous ? "Anónimo" : (photo.uploaded_by_name || "Invitado");

  return (
    <div
      style={lb.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Stop click propagation so clicks on the image/footer don't close */}
      <div style={lb.inner} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button type="button" style={lb.closeBtn} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Foto de ${author}`} style={lb.img} />

        {/* Footer bar */}
        <div style={lb.footer}>
          <span style={lb.footerAuthor}>{author}</span>
          <span style={lb.footerTime}>
            {new Date(photo.created_at).toLocaleString("es-CO", {
              day: "2-digit", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <a
            href={src}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={lb.downloadBtn}
            onClick={(e) => e.stopPropagation()}
          >
            ↓ Descargar
          </a>
        </div>
      </div>
    </div>
  );
}

const lb: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 300,
    background: "rgba(0,0,0,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    cursor: "zoom-out",
  },
  inner: {
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    maxWidth: "min(90vw, 1000px)",
    maxHeight: "92dvh",
    cursor: "default",
  },
  closeBtn: {
    position: "absolute" as const,
    top: -14,
    right: -14,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
  },
  img: {
    maxWidth: "100%",
    maxHeight: "80dvh",
    objectFit: "contain" as const,
    borderRadius: 12,
    display: "block",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: "10px 16px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    backdropFilter: "blur(8px)",
    width: "100%",
  },
  footerAuthor: {
    fontSize: 13,
    fontWeight: 700,
    color: "#ffffff",
    flex: 1,
  },
  footerTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  downloadBtn: {
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)",
    textDecoration: "none",
    flexShrink: 0,
  },
};

// ─── PhotoMetadataModal ───────────────────────────────────────────────────────

function PhotoMetadataModal({ photo, onClose }: { photo: PhotoRecord; onClose: () => void }) {
  const exif = photo.exif_data;
  const dev = photo.device_data;

  const rows: { label: string; value: string | number | null | undefined; section?: string }[] = [
    { label: "——", value: "ARCHIVO", section: "header" },
    { label: "Nombre original",     value: photo.original_name },
    { label: "Tipo",                value: photo.original_mime_type },
    { label: "Tamaño original",     value: photo.original_size_bytes ? formatBytes(photo.original_size_bytes) : null },
    { label: "Dimensiones orig.",   value: photo.original_width && photo.original_height ? `${photo.original_width} × ${photo.original_height} px` : null },
    { label: "Tamaño renderizado",  value: (photo as PhotoRecord & { size_bytes?: number }).size_bytes ? formatBytes((photo as PhotoRecord & { size_bytes?: number }).size_bytes!) : null },
    { label: "Filtro",              value: photo.filter_name && photo.filter_name !== "none" ? photo.filter_name : null },
    { label: "Plantilla",           value: photo.template_key },
    { label: "Subida el",           value: new Date(photo.created_at).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }) },

    { label: "——", value: "IDENTIDAD", section: "header" },
    { label: "Nombre",              value: photo.is_anonymous ? "Anónimo" : (photo.uploaded_by_name ?? "Invitado") },
    { label: "Email",               value: photo.uploaded_by_email },
    { label: "Anónimo",             value: photo.is_anonymous ? "Sí" : "No" },

    ...(dev ? [
      { label: "——", value: "DISPOSITIVO", section: "header" },
      { label: "IP",                value: photo.upload_ip },
      { label: "Navegador",         value: dev.browser },
      { label: "Sistema operativo", value: dev.os },
      { label: "Tipo de equipo",    value: dev.deviceType },
      { label: "Idioma",            value: dev.language },
      { label: "Zona horaria",      value: dev.timezone },
      { label: "Resolución",        value: dev.screenWidth && dev.screenHeight ? `${dev.screenWidth} × ${dev.screenHeight}` : null },
      { label: "Pixel ratio",       value: dev.pixelRatio },
      { label: "User agent",        value: dev.userAgent },
    ] : [
      { label: "——", value: "DISPOSITIVO", section: "header" },
      { label: "IP",                value: photo.upload_ip },
    ]),

    ...(exif ? [
      { label: "Cámara",            value: [exif.make, exif.model].filter(Boolean).join(" ") || null },
      { label: "Lente",             value: exif.lens },
      { label: "Fecha de captura",  value: exif.dateTaken ? new Date(exif.dateTaken).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }) : null },
      { label: "ISO",               value: exif.iso },
      { label: "Apertura",          value: exif.aperture ? `f/${exif.aperture}` : null },
      { label: "Vel. obturador",    value: exif.shutterSpeed },
      { label: "Focal",             value: exif.focalLength ? `${exif.focalLength} mm` : null },
      { label: "Flash",             value: exif.flash },
      { label: "Balance de blancos",value: exif.whiteBalance },
      { label: "Comp. exposición",  value: exif.exposureCompensation != null ? `${exif.exposureCompensation > 0 ? "+" : ""}${exif.exposureCompensation} EV` : null },
      { label: "Espacio de color",  value: exif.colorSpace },
      { label: "GPS",               value: exif.gpsLat != null && exif.gpsLon != null ? `${exif.gpsLat.toFixed(6)}, ${exif.gpsLon.toFixed(6)}${exif.gpsAlt != null ? ` · ${exif.gpsAlt.toFixed(0)} m` : ""}` : null },
    ] : []),
  ].filter((r) => r.section === "header" || (r.value != null && r.value !== ""));

  // Remove orphaned section headers (header followed immediately by another header or end)
  const cleaned = rows.filter((r, i) => {
    if (r.section !== "header") return true;
    const next = rows[i + 1];
    return next && next.section !== "header";
  });

  return (
    <div style={mStyles.backdrop} onClick={onClose}>
      <div style={mStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={mStyles.header}>
          <span style={mStyles.title}>Metadatos de la foto</span>
          <button type="button" style={mStyles.close} onClick={onClose}>✕</button>
        </div>
        <div style={mStyles.body}>
          {cleaned.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No hay metadatos disponibles para esta foto.</p>
          ) : (
            <dl style={mStyles.dl}>
              {cleaned.map((r, i) =>
                r.section === "header" ? (
                  <div key={i} style={mStyles.sectionHead}>{String(r.value)}</div>
                ) : (
                  <div key={r.label} style={mStyles.dlRow}>
                    <dt style={mStyles.dt}>{r.label}</dt>
                    <dd style={mStyles.dd}>{String(r.value)}</dd>
                  </div>
                )
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

const mStyles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  },
  modal: {
    background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480,
    maxHeight: "80dvh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 22px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)",
    flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" },
  close: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 14, color: "var(--muted)", padding: "4px 8px", borderRadius: 8,
  },
  body: { overflowY: "auto", padding: "16px 22px 22px" },
  dl: { display: "grid", gap: 0, margin: 0 },
  dlRow: {
    display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8,
    padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
    alignItems: "baseline",
  },
  dt: { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
  dd: { fontSize: 13, color: "#111", margin: 0, wordBreak: "break-word" },
  sectionHead: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const,
    color: "var(--muted)", padding: "14px 0 6px", borderBottom: "1px solid rgba(0,0,0,0.07)",
    marginBottom: 2,
  },
};

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
  creditsChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.05)",
    border: "1px solid rgba(0,0,0,0.1)",
    fontSize: 13,
    color: "#111",
    cursor: "pointer",
    fontWeight: 600,
  },
  creditsIcon: { fontSize: 14, color: "#6d28d9" },
  creditsBig: { fontSize: 18, fontWeight: 800, color: "#6d28d9" },
  txRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  creditsBtn: {
    width: "100%",
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: 12,
    background: "rgba(109,40,217,0.04)",
    border: "1px solid rgba(109,40,217,0.12)",
    color: "#6d28d9",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
    letterSpacing: "-0.01em",
  },
  creditsBtnActive: {
    width: "100%",
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: 12,
    background: "rgba(109,40,217,0.12)",
    border: "1px solid rgba(109,40,217,0.28)",
    color: "#5b21b6",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left" as const,
    letterSpacing: "-0.01em",
  },
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
    display: "flex",
    flexDirection: "column",
    gap: 8,
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
  signOutBtn: {
    width: "100%",
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: 12,
    background: "transparent",
    border: "1px solid rgba(0,0,0,0.07)",
    color: "var(--muted)",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
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
  dirtyDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#f59e0b",
    marginLeft: 6,
    verticalAlign: "middle",
    flexShrink: 0,
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
  requiredTag: { fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.04em", textTransform: "uppercase" as const, marginLeft: 4 },
  inputError: { borderColor: "#dc2626", boxShadow: "0 0 0 3px rgba(220,38,38,0.12)" },
  fieldErrorMsg: { fontSize: 11, color: "#dc2626", fontWeight: 600, lineHeight: 1.4 },
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
  exportBtnApprove: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#059669",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  exportBtnDanger: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
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
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
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
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  filterCount: { background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  filterCountActive: { background: "rgba(0,0,0,0.12)" },
  filterCountPending: { background: "rgba(245,158,11,0.15)", color: "#78350f" },
  refreshBtn: {
    marginLeft: "auto",
    flexShrink: 0,
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
  likesChip: { fontSize: 10, color: "#e05", marginTop: 2, width: "fit-content" },
  photoActions: { padding: "10px 12px 12px", display: "flex", flexDirection: "column" as const, gap: 7 },
  actionRow: { display: "flex", gap: 6 },
  confirmText: { fontSize: 12, color: "#7f1d1d", fontWeight: 600, margin: 0 },
  actionApprove: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(16,185,129,0.3)",
    background: "rgba(16,185,129,0.1)",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionReject: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.07)",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionDanger: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.07)",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionNeutral: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionSecondary: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "transparent",
    color: "var(--muted)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionSecondaryDanger: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(220,38,38,0.15)",
    background: "transparent",
    color: "#dc2626",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center" as const,
  },
  actionMeta: {
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

  helpBtn: {
    position: "fixed" as const,
    bottom: 24,
    right: 24,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#111111",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
    lineHeight: 1,
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

// ─── TourSpotlight ────────────────────────────────────────────────────────────

const TOUR_STEPS_DEF: Array<{
  selector: string;
  tab: "evento" | "resumen" | "fotos";
  title: string;
  body: string;
}> = [
  {
    selector: '[data-tour="section-evento"]',
    tab: "evento",
    title: "1 · Nombre y URL del evento",
    body: "Aquí defines los datos clave: el nombre del evento (lo que aparece en la galería), la fecha, el lugar y la URL única. La URL es la dirección que compartirás con tus invitados — por ejemplo memorica.app/event/boda-ana-y-juan. El nombre y la URL son obligatorios para poder guardar.",
  },
  {
    selector: '[data-tour="section-design"]',
    tab: "evento",
    title: "2 · Apariencia y tema visual",
    body: "Elige una de las plantillas prediseñadas: cada una tiene una combinación única de colores, tipografía y estilo. Puedes afinar el color de acento y subir una foto de portada para que la galería refleje la identidad de tu evento. Este diseño es lo que verán tus invitados al abrir el enlace.",
  },
  {
    selector: '[data-tour="section-gallery"]',
    tab: "evento",
    title: "3 · Vista de la galería",
    body: "Decide cómo se muestran las fotos en la página del evento: cuadrícula (mosaico de todas las fotos) o slider (una foto a la vez con flechas). También puedes activar filtros de color al subir fotos y marcos decorativos que se aplican automáticamente a cada imagen.",
  },
  {
    selector: '[data-tour="section-upload"]',
    tab: "evento",
    title: "4 · Reglas de subida de fotos",
    body: "Aquí controlas quién puede subir y cómo. Moderación manual: cada foto espera tu aprobación antes de aparecer en la galería. Moderación automática: las fotos se aprueban al instante. También puedes limitar el tamaño máximo por foto y habilitar o deshabilitar la subida para los invitados.",
  },
  {
    selector: '[data-tour="section-texts"]',
    tab: "evento",
    title: "5 · Textos de la página del evento",
    body: "Personaliza todo el contenido que leerán tus invitados: el título grande de la portada, el subtítulo, el mensaje de bienvenida y el texto del botón para subir fotos. Estos textos se pre-rellenan según el tipo de evento, pero puedes cambiarlos a tu gusto.",
  },
  {
    selector: '[data-tour="section-status"]',
    tab: "resumen",
    title: "6 · Estado del evento (activo / pausado)",
    body: "Este interruptor controla si tu evento está en vivo. Cuando está activo, los invitados pueden abrir el enlace, ver la galería y subir fotos en tiempo real. Pausarlo bloquea el acceso público sin borrar nada — útil si quieres moderar antes de abrir o al terminar el evento.",
  },
  {
    selector: '[data-tour="section-share"]',
    tab: "resumen",
    title: "7 · Comparte el evento",
    body: "Aquí está todo lo que necesitas para difundir el evento: el enlace directo para copiar, el código QR listo para imprimir en mesas o pantallas, y el botón de compartir por WhatsApp. El QR lleva a tus invitados directo a la galería — sin apps, sin registro.",
  },
  {
    selector: '[data-tour="section-filter-bar"]',
    tab: "fotos",
    title: "8 · Moderación de fotos",
    body: "En esta pestaña ves y gestionas todas las fotos de tu evento. Filtra por estado: pendientes de revisión, aprobadas (visibles en la galería) o rechazadas. Puedes moderar una a una o seleccionar varias para aprobar, rechazar o eliminar en bloque. Al final del evento, exporta todo el álbum como ZIP.",
  },
];

type TourStep = (typeof TOUR_STEPS_DEF)[number];

function TourSpotlight({
  steps,
  step,
  onNext,
  onPrev,
  onClose,
}: {
  steps: TourStep[];
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  // initialise from window so tooltip renders correctly on first paint
  const [vpW, setVpW] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const [vpH, setVpH] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isMobile = vpW > 0 && vpW < 600;

  useEffect(() => {
    if (!current) return;

    const t1 = setTimeout(() => setRect(null), 0);
    const t2 = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(current.selector);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
        setVpW(window.innerWidth);
        setVpH(window.innerHeight);
      }, 350);
    }, 80);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [current]);

  if (!current) return null;

  // ── Tooltip placement ────────────────────────────────────────────
  // Mobile: pin to bottom as a sheet — always visible, full-width
  // Desktop: position near the highlighted element
  const TIP_W = 360;
  const TIP_H = 230;
  const PAD = 16;

  let tipStyle: React.CSSProperties;

  if (isMobile) {
    // Centered card on mobile — easy to read, doesn't matter where element is
    tipStyle = {
      position: "fixed",
      top: "50%",
      left: PAD,
      right: PAD,
      transform: "translateY(-50%)",
      zIndex: 320,
    };
  } else if (rect && vpW && vpH) {
    const spaceBelow = vpH - rect.bottom;
    const cx = rect.left + rect.width / 2;
    const left = Math.max(PAD, Math.min(cx - TIP_W / 2, vpW - TIP_W - PAD));
    const placement: "below" | "above" = spaceBelow >= TIP_H + 20 ? "below" : "above";
    const rawTop = placement === "below" ? rect.bottom + 14 : rect.top - TIP_H - 14;
    const top = Math.max(PAD, rawTop);
    tipStyle = { position: "fixed", top, left, width: TIP_W, zIndex: 320 };
  } else {
    tipStyle = {
      position: "fixed",
      bottom: 32,
      left: "50%",
      transform: "translateX(-50%)",
      width: TIP_W,
      zIndex: 320,
    };
  }

  return (
    <>
      {/* Dark scrim — clicking it closes the tour */}
      <div style={ts.overlay} onClick={onClose} aria-label="Cerrar tour" />

      {/* Spotlight ring — sits on top of scrim, frames the target element */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 7,
            left: rect.left - 7,
            width: rect.width + 14,
            height: rect.height + 14,
            borderRadius: 16,
            // The huge spread shadow creates the dark overlay effect everywhere *outside* this box
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.58)",
            outline: "2px solid rgba(255,255,255,0.18)",
            pointerEvents: "none",
            zIndex: 312,
            transition: "top 280ms ease, left 280ms ease, width 280ms ease, height 280ms ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{ ...ts.tip, ...tipStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient progress bar */}
        <div style={ts.progressBar}>
          <div
            style={{
              ...ts.progressFill,
              width: `${((step + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        <div style={ts.tipInner}>
          <div style={ts.tipHeader}>
            <span style={ts.counter}>{step + 1} de {steps.length}</span>
            <button type="button" style={ts.closeX} onClick={onClose} aria-label="Cerrar tour">✕</button>
          </div>

          <h3 style={ts.tipTitle}>{current.title}</h3>
          <p style={ts.tipBody}>{current.body}</p>

          <div style={ts.tipNav}>
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" style={ts.navBtn} onClick={onPrev}>
                ← Atrás
              </button>
            ) : (
              <button type="button" style={ts.skipBtn} onClick={onClose}>
                Saltar tour
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={ts.navBtnPrimary}
              onClick={isLast ? onClose : onNext}
            >
              {isLast ? "¡Listo!" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const ts: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 310,
    cursor: "pointer",
    // Subtle fallback bg while rect is being measured; ring box-shadow takes over after
    background: "rgba(0,0,0,0.18)",
  },
  tip: {
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 32px 96px rgba(0,0,0,0.32), 0 4px 24px rgba(0,0,0,0.14)",
    overflow: "hidden",
  },
  progressBar: {
    height: 4,
    background: "rgba(0,0,0,0.07)",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #ec4899)",
    transition: "width 320ms ease",
    borderRadius: "0 3px 3px 0",
  },
  tipInner: {
    padding: "16px 20px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  tipHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "rgba(0,0,0,0.28)",
    textTransform: "uppercase" as const,
  },
  closeX: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "rgba(0,0,0,0.32)",
    padding: "2px 4px",
    lineHeight: 1,
  },
  tipTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
    color: "#0b0b0f",
  },
  tipBody: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.7,
    color: "var(--muted)",
  },
  tipNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  skipBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    color: "var(--muted)",
    padding: "4px 0",
    flexShrink: 0,
  },
  navBtn: {
    fontSize: 13,
    padding: "9px 18px",
    flexShrink: 0,
  },
  navBtnPrimary: {
    fontSize: 13,
    padding: "9px 18px",
    flexShrink: 0,
    marginLeft: "auto",
  },
};
