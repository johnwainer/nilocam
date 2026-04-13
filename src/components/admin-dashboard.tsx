"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { QRCodeCard } from "@/components/qr-code-card";
import { Button } from "@/components/button";
import { BrandMark } from "@/components/brand-mark";
import { buildThemeSeed, createDefaultSections, getEventType, getEventTypes } from "@/lib/event-types";
import { removePhoto, saveEvent, updatePhotoStatus } from "@/lib/browser-store";
import { buildEventUrl } from "@/lib/site";
import type { EventRecord, EventStore, EventVisibility, LandingSection, PhotoRecord } from "@/lib/types";
import { clampText, slugify } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Camera,
  Eye,
  Layers3,
  PencilLine,
  Plus,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "landing", label: "Landing", icon: Layers3 },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "access", label: "Access", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

function createEventDraft(): EventRecord {
  const type = getEventTypes()[0];
  const slug = slugify(`${type.label}-demo-${Date.now()}`);

  return {
    id: crypto.randomUUID(),
    slug,
    title: "Nuevo evento Nilo Cam",
    description: type.description,
    eventType: type.key,
    dateLabel: "22 de mayo de 2026",
    venue: "Lugar por definir",
    organizer: "Dueño del evento",
    publicUrl: buildEventUrl(slug),
    qrLabel: `nilo.cam/${slug}`,
    theme: buildThemeSeed(type.key),
    visibility: "moderated",
    allowAnonymous: true,
    requireGuestName: false,
    maxPhotoMb: 12,
    highlightLimit: 6,
    logoText: "Nilo Cam",
    heroTagline: type.defaultTagline,
    landingSections: createDefaultSections(type.key),
    ctas: type.ctas,
  };
}

function createSectionDraft(kind: LandingSection["kind"] = "cta"): LandingSection {
  const templates: Record<LandingSection["kind"], { title: string; body: string }> = {
    hero: {
      title: "Hero principal",
      body: "Introduce el evento con una apertura visual y una CTA contundente.",
    },
    highlights: {
      title: "Puntos clave",
      body: "Resalta beneficios, reglas o mensajes importantes del evento.",
    },
    instructions: {
      title: "Cómo participar",
      body: "Guía breve para tomar o subir fotos desde el teléfono.",
    },
    gallery: {
      title: "Galería viva",
      body: "Muestra las fotos más recientes con presencia destacada.",
    },
    story: {
      title: "Historia del evento",
      body: "Cuenta el contexto, la intención o el tono de la celebración.",
    },
    countdown: {
      title: "Cuenta regresiva",
      body: "Agrega urgencia visual si el evento aún no empieza o está por abrir.",
    },
    faq: {
      title: "Preguntas frecuentes",
      body: "Aclara dudas sobre acceso, moderación y publicación.",
    },
    cta: {
      title: "Llamado a la acción",
      body: "Empuja al invitado a subir una foto o abrir la cámara otra vez.",
    },
  };

  return {
    id: crypto.randomUUID(),
    kind,
    enabled: true,
    ...templates[kind],
  };
}

type Props = {
  initialStore: EventStore;
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--app-border)] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-black">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{hint}</p>
    </div>
  );
}

function PhotoCard({
  photo,
  onApprove,
  onReject,
  onDelete,
}: {
  photo: PhotoRecord;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-[var(--app-border)] bg-white">
      <div className="relative h-52 w-full">
        <Image src={photo.src} alt={photo.note || "Foto"} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 320px" />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-black">{photo.anonymous ? "Anónimo" : photo.authorName}</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">{photo.note || "Sin nota"}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              photo.status === "published"
                ? "bg-black text-white"
                : "bg-black/5 text-black"
            }`}
          >
            {photo.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {onApprove && (
            <Button tone="secondary" className="px-3 py-2 text-xs" onClick={() => onApprove(photo.id)}>
              Publicar
            </Button>
          )}
          {onReject && (
            <Button tone="soft" className="px-3 py-2 text-xs" onClick={() => onReject(photo.id)}>
              Rechazar
            </Button>
          )}
          {onDelete && (
            <Button tone="ghost" className="px-3 py-2 text-xs" onClick={() => onDelete(photo.id)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminDashboard({ initialStore }: Props) {
  const [store, setStore] = useState(initialStore);
  const [selectedSlug, setSelectedSlug] = useState(store.events[0]?.slug ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copyMessage, setCopyMessage] = useState("");

  const selectedEvent = useMemo(
    () => store.events.find((event) => event.slug === selectedSlug) ?? store.events[0],
    [selectedSlug, store.events],
  );

  const [draft, setDraft] = useState<EventRecord>(selectedEvent ?? createEventDraft());

  const eventPhotos = store.photos.filter((photo) => photo.eventSlug === selectedEvent?.slug);
  const publishedPhotos = eventPhotos.filter((photo) => photo.status === "published");
  const pendingPhotos = eventPhotos.filter((photo) => photo.status === "pending");

  function sync(nextEvent: EventRecord) {
    saveEvent(nextEvent);
    setStore((current) => ({
      ...current,
      events: current.events.map((event) => (event.slug === nextEvent.slug ? nextEvent : event)),
    }));
    setDraft(nextEvent);
    setSelectedSlug(nextEvent.slug);
  }

  function handleCreateEvent() {
    const next = createEventDraft();
    saveEvent(next);
    setStore((current) => ({ ...current, events: [next, ...current.events] }));
    setSelectedSlug(next.slug);
    setDraft(next);
    setActiveTab("overview");
  }

  function updateSection(id: string, patch: Partial<LandingSection>) {
    setDraft((current) => ({
      ...current,
      landingSections: current.landingSections.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    }));
  }

  function addSection() {
    setDraft((current) => ({
      ...current,
      landingSections: [...current.landingSections, createSectionDraft("cta")],
    }));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.landingSections.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.landingSections.length) {
        return current;
      }
      const nextSections = [...current.landingSections];
      [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];
      return { ...current, landingSections: nextSections };
    });
  }

  function handleTypeChange(value: EventRecord["eventType"]) {
    const type = getEventType(value);
    setDraft((current) => ({
      ...current,
      eventType: value,
      description: type.description,
      heroTagline: type.defaultTagline,
      ctas: type.ctas,
      theme: buildThemeSeed(value),
      landingSections: createDefaultSections(value),
    }));
  }

  const metrics = [
    {
      label: "Fotos publicadas",
      value: `${publishedPhotos.length}`,
      hint: "Aparecen en el muro principal en tiempo real.",
    },
    {
      label: "Pendientes",
      value: `${pendingPhotos.length}`,
      hint: "En espera de moderación del dueño del evento.",
    },
    {
      label: "Límite por foto",
      value: `${draft.maxPhotoMb} MB`,
      hint: "Límite configurable según el tipo de evento.",
    },
    {
      label: "Tipos",
      value: "10",
      hint: "Listos para personalizar por evento.",
    },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1560px] px-4 py-5 sm:px-6 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <aside className="space-y-6">
          <div className="panel reveal rounded-[34px] p-5 sm:p-6">
            <BrandMark compact />
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Nilo Cam Studio</p>
                <h1 className="mt-2 text-3xl font-semibold text-black">Admin operativo</h1>
              </div>
              <Button tone="secondary" onClick={handleCreateEvent}>
                <Plus className="h-4 w-4" />
                Nuevo evento
              </Button>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--app-muted)]">
              Gestiona eventos, landing, fotos, roles y enlaces desde una sola pantalla. La idea es que
              esto se vea y se sienta como una herramienta que ya puedes vender.
            </p>
          </div>

          <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Eventos</p>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-scroll snap-x snap-mandatory">
              {store.events.map((event) => (
                <button
                  key={event.id}
                  className={`min-w-[240px] snap-start rounded-[28px] border px-4 py-4 text-left transition ${
                    selectedEvent?.slug === event.slug
                      ? "border-black bg-black text-white"
                      : "border-[var(--app-border)] bg-white hover:bg-black/3"
                  }`}
                  onClick={() => {
                    setSelectedSlug(event.slug);
                    setDraft(event);
                  }}
                >
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className={selectedEvent?.slug === event.slug ? "mt-1 text-xs text-white/70" : "mt-1 text-xs text-[var(--app-muted)]"}>
                    {event.qrLabel}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Sparkles className="h-4 w-4" />
              Tipos rápidos
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 snap-scroll snap-x snap-mandatory">
              {getEventTypes().map((type) => (
                <div
                  key={type.key}
                  className="min-w-[180px] snap-start rounded-[24px] border border-[var(--app-border)] bg-black/3 p-3"
                >
                  <p className="text-xs font-semibold text-black">{type.label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
                    {clampText(type.description, 74)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel reveal reveal-delay-3 rounded-[34px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Users className="h-4 w-4" />
              Atajos
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Publicar fotos pendientes",
                "Reordenar landing",
                "Cambiar URL del evento",
                "Duplicar configuración",
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-[var(--app-border)] bg-white p-4 text-sm text-black">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="panel reveal rounded-[34px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Evento activo</p>
                <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-semibold text-black lg:text-5xl">
                  {draft.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
                  Edita landing, identidad, acceso y moderación desde secciones claras. Los cambios se
                  guardan para que el evento deje de sentirse “demo” y se convierta en producto.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button tone="secondary" onClick={() => sync(draft)}>
                  <RefreshCw className="h-4 w-4" />
                  Guardar
                </Button>
                <Button
                  onClick={() =>
                    navigator.clipboard.writeText(draft.publicUrl).then(() => {
                      setCopyMessage("URL copiada");
                      setTimeout(() => setCopyMessage(""), 1800);
                    })
                  }
                >
                  {copyMessage || "Copiar URL"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-[var(--app-border)] bg-white text-black hover:bg-black/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.58fr]">
            <div className="space-y-6">
              {activeTab === "overview" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                      <MetricCard key={metric.label} {...metric} />
                    ))}
                  </div>

                  <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Resumen del evento</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">{draft.heroTagline}</h3>
                      </div>
                      <Button tone="secondary" onClick={() => setActiveTab("landing")}>
                        <PencilLine className="h-4 w-4" />
                        Editar landing
                      </Button>
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[26px] border border-[var(--app-border)] bg-black/3 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Fecha</p>
                        <p className="mt-2 text-sm font-semibold text-black">{draft.dateLabel}</p>
                      </div>
                      <div className="rounded-[26px] border border-[var(--app-border)] bg-black/3 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Lugar</p>
                        <p className="mt-2 text-sm font-semibold text-black">{draft.venue}</p>
                      </div>
                      <div className="rounded-[26px] border border-[var(--app-border)] bg-black/3 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Visibilidad</p>
                        <p className="mt-2 text-sm font-semibold text-black">
                          {draft.visibility === "public" ? "Publicación directa" : "Moderación"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Actividad reciente</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">Fotos del evento</h3>
                      </div>
                      <Button tone="secondary" onClick={() => setActiveTab("photos")}>
                        <Upload className="h-4 w-4" />
                        Ver todas
                      </Button>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {publishedPhotos.slice(0, 2).map((photo) => (
                        <div key={photo.id} className="rounded-[28px] border border-[var(--app-border)] bg-white p-4">
                          <div className="relative h-44 overflow-hidden rounded-[24px]">
                            <Image src={photo.src} alt="" fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 320px" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-black">{photo.anonymous ? "Anónimo" : photo.authorName}</p>
                          <p className="mt-1 text-xs text-[var(--app-muted)]">{photo.note || "Sin nota"}</p>
                        </div>
                      ))}
                      {publishedPhotos.length === 0 && (
                        <div className="rounded-[28px] border border-[var(--app-border)] bg-black/3 p-5 text-sm text-[var(--app-muted)] md:col-span-2">
                          Aún no hay fotos publicadas. Cuando lleguen, aparecerán aquí y en la landing en vivo.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "landing" && (
                <>
                  <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Branding</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">Identidad del evento</h3>
                      </div>
                      <div className="rounded-full border border-[var(--app-border)] bg-black p-3 text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="Título"
                      />
                      <input
                        value={draft.logoText}
                        onChange={(event) => setDraft((current) => ({ ...current, logoText: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="Logo text"
                      />
                      <input
                        value={draft.heroTagline}
                        onChange={(event) => setDraft((current) => ({ ...current, heroTagline: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none md:col-span-2"
                        placeholder="Hero tagline"
                      />
                      <select
                        value={draft.eventType}
                        onChange={(event) => handleTypeChange(event.target.value as EventRecord["eventType"])}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                      >
                        {getEventTypes().map((type) => (
                          <option key={type.key} value={type.key}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draft.visibility}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            visibility: event.target.value as EventVisibility,
                          }))
                        }
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                      >
                        <option value="moderated">Con moderación</option>
                        <option value="public">Publicación directa</option>
                      </select>
                    </div>
                  </div>

                  <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Estructura</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">Secciones del landing</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button tone="secondary" onClick={addSection}>
                          <Plus className="h-4 w-4" />
                          Agregar sección
                        </Button>
                        <Button tone="secondary" onClick={() => sync(draft)}>
                          Guardar landing
                        </Button>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4">
                      {draft.landingSections.map((section, index) => (
                        <div key={section.id} className="rounded-[28px] border border-[var(--app-border)] bg-white p-5">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                                  {section.kind}
                                </span>
                                <span className="text-xs text-[var(--app-muted)]">Bloque {index + 1}</span>
                              </div>
                              <input
                                value={section.title}
                                onChange={(event) => updateSection(section.id, { title: event.target.value })}
                                className="mt-3 w-full rounded-2xl border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm text-black outline-none"
                              />
                              <textarea
                                value={section.body}
                                onChange={(event) => updateSection(section.id, { body: event.target.value })}
                                className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm text-black outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="rounded-full border border-[var(--app-border)] bg-black/3 p-2 text-black transition hover:bg-black/8"
                                onClick={() => moveSection(section.id, -1)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                className="rounded-full border border-[var(--app-border)] bg-black/3 p-2 text-black transition hover:bg-black/8"
                                onClick={() => moveSection(section.id, 1)}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <Button
                                tone={section.enabled ? "secondary" : "ghost"}
                                onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                              >
                                {section.enabled ? "Visible" : "Oculta"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "photos" && (
                <>
                  <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Moderación</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">Fotos pendientes</h3>
                      </div>
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                        {pendingPhotos.length} pendientes
                      </span>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {pendingPhotos.map((photo) => (
                        <PhotoCard
                          key={photo.id}
                          photo={photo}
                          onApprove={(id) => updatePhotoStatus(id, "published")}
                          onReject={(id) => updatePhotoStatus(id, "pending")}
                          onDelete={(id) => removePhoto(id)}
                        />
                      ))}
                      {pendingPhotos.length === 0 && (
                        <div className="rounded-[28px] border border-[var(--app-border)] bg-black/3 p-5 text-sm text-[var(--app-muted)] md:col-span-2">
                          No hay fotos pendientes. El flujo está listo para publicación directa.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Publicadas</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">Muro actual</h3>
                      </div>
                      <Button tone="secondary" onClick={() => setActiveTab("overview")}>
                        <Eye className="h-4 w-4" />
                        Ver overview
                      </Button>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {publishedPhotos.map((photo) => (
                        <PhotoCard
                          key={photo.id}
                          photo={photo}
                          onDelete={(id) => removePhoto(id)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "access" && (
                <>
                  <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Acceso</p>
                        <h3 className="mt-2 text-2xl font-semibold text-black">QR y enlaces</h3>
                      </div>
                      <Button tone="secondary" onClick={() => sync(draft)}>
                        <ScanFace className="h-4 w-4" />
                        Guardar acceso
                      </Button>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <input
                        value={draft.slug}
                        onChange={(event) =>
                          setDraft((current) => {
                            const nextSlug = slugify(event.target.value);
                            return {
                              ...current,
                              slug: nextSlug,
                              publicUrl: buildEventUrl(nextSlug),
                              qrLabel: `nilo.cam/${nextSlug}`,
                            };
                          })
                        }
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="slug"
                      />
                      <input
                        value={draft.publicUrl}
                        onChange={(event) => setDraft((current) => ({ ...current, publicUrl: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="Public URL"
                      />
                      <input
                        value={draft.dateLabel}
                        onChange={(event) => setDraft((current) => ({ ...current, dateLabel: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="Fecha"
                      />
                      <input
                        value={draft.venue}
                        onChange={(event) => setDraft((current) => ({ ...current, venue: event.target.value }))}
                        className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                        placeholder="Lugar"
                      />
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <label className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4 text-sm text-black">
                        <span className="block text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Anonimato</span>
                        <select
                          value={draft.allowAnonymous ? "true" : "false"}
                          onChange={(event) => setDraft((current) => ({ ...current, allowAnonymous: event.target.value === "true" }))}
                          className="mt-2 w-full bg-transparent outline-none"
                        >
                          <option value="true">Permitido</option>
                          <option value="false">No permitido</option>
                        </select>
                      </label>
                      <label className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4 text-sm text-black">
                        <span className="block text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Límite MB</span>
                        <input
                          value={draft.maxPhotoMb}
                          type="number"
                          min={1}
                          onChange={(event) => setDraft((current) => ({ ...current, maxPhotoMb: Number(event.target.value) }))}
                          className="mt-2 w-full bg-transparent outline-none"
                        />
                      </label>
                      <label className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4 text-sm text-black">
                        <span className="block text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Highlight limit</span>
                        <input
                          value={draft.highlightLimit}
                          type="number"
                          min={1}
                          onChange={(event) => setDraft((current) => ({ ...current, highlightLimit: Number(event.target.value) }))}
                          className="mt-2 w-full bg-transparent outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="reveal reveal-delay-1">
                <QRCodeCard
                  url={draft.publicUrl}
                  label={draft.qrLabel}
                  onCopy={(value) =>
                    navigator.clipboard.writeText(value).then(() => setCopyMessage("URL del QR copiada"))
                  }
                />
              </div>

              <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Resumen operativo</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Landing</p>
                    <p className="mt-1 text-sm text-black">{draft.heroTagline}</p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Modo</p>
                    <p className="mt-1 text-sm text-black">
                      {draft.visibility === "public" ? "Publicación inmediata" : "Revisión antes de publicar"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Roles</p>
                    <p className="mt-1 text-sm text-black">Admin y dueño del evento listos para escalar a más roles.</p>
                  </div>
                </div>
              </div>

              <div className="panel reveal reveal-delay-3 rounded-[34px] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">Producción</p>
                    <p className="text-xs text-[var(--app-muted)]">{selectedEvent?.slug}</p>
                  </div>
                  <Button tone="secondary" onClick={() => setActiveTab("photos")}>
                    <Upload className="h-4 w-4" />
                    Gestionar fotos
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">CTA principal</p>
                    <p className="mt-1 text-sm text-black">{draft.ctas.primary}</p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">CTA secundario</p>
                    <p className="mt-1 text-sm text-black">{draft.ctas.secondary}</p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">CTA final</p>
                    <p className="mt-1 text-sm text-black">{draft.ctas.tertiary}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[1560px] px-4 pb-4 sm:px-6 lg:px-10">
        <div className="panel-strong flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Panel de servicio</p>
            <p className="text-xs text-white/65">Secciones, fotos, QR y acceso en una sola vista</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button tone="secondary" onClick={() => setActiveTab("overview")} className="px-4 py-2">
              Overview
            </Button>
            <Button onClick={() => sync(draft)} className="px-4 py-2">
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
