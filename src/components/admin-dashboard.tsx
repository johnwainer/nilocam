"use client";

import { useMemo, useState } from "react";
import { QRCodeCard } from "@/components/qr-code-card";
import { Button } from "@/components/button";
import { buildThemeSeed, createDefaultSections, getEventType, getEventTypes } from "@/lib/event-types";
import { saveEvent } from "@/lib/browser-store";
import { buildEventUrl } from "@/lib/site";
import type { EventRecord, EventVisibility } from "@/lib/types";
import { clampText, slugify } from "@/lib/utils";
import type { EventStore } from "@/lib/types";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

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

type Props = {
  initialStore: EventStore;
};

export function AdminDashboard({ initialStore }: Props) {
  const [store, setStore] = useState(initialStore);
  const [selectedSlug, setSelectedSlug] = useState(store.events[0]?.slug ?? "");
  const selectedEvent = useMemo(
    () => store.events.find((event) => event.slug === selectedSlug) ?? store.events[0],
    [selectedSlug, store.events],
  );
  const [draft, setDraft] = useState<EventRecord>(selectedEvent ?? createEventDraft());
  const [copyMessage, setCopyMessage] = useState("");

  const selectedPhotos = store.photos.filter((photo) => photo.eventSlug === selectedEvent?.slug);

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
    const nextStore = { ...store, events: [next, ...store.events] };
    saveEvent(next);
    setStore(nextStore);
    setSelectedSlug(next.slug);
    setDraft(next);
  }

  function handleUpdateField<K extends keyof EventRecord>(key: K, value: EventRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
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

  function handleSectionToggle(id: string) {
    setDraft((current) => ({
      ...current,
      landingSections: current.landingSections.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section,
      ),
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

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
      <aside className="glass-card rounded-[34px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Admin Nilo Cam</p>
            <p className="text-xs text-white/50">Eventos, landing y QR</p>
          </div>
          <Button tone="secondary" onClick={handleCreateEvent}>
            <Plus className="h-4 w-4" />
            Crear
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {store.events.map((event) => (
            <button
              key={event.id}
              className={`w-full rounded-[24px] border p-4 text-left transition ${
                selectedEvent?.slug === event.slug
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/8"
              }`}
              onClick={() => {
                setSelectedSlug(event.slug);
                setDraft(event);
              }}
            >
              <p className="text-sm font-semibold text-white">{event.title}</p>
              <p className="mt-1 text-xs text-white/50">{event.qrLabel}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm text-white">
            <Sparkles className="h-4 w-4" />
            Tipos listos
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {getEventTypes().map((type) => (
              <div key={type.key} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-semibold text-white">{type.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/50">{clampText(type.description, 74)}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="glass-card rounded-[34px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Constructor visual</p>
              <h1 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-white">
                {draft.title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Edita el evento, cambia el landing según el tipo y define si las fotos se publican
                directo o pasan por moderación.
              </p>
            </div>
            <div className="flex gap-2">
              <Button tone="secondary" onClick={() => sync(draft)}>
                <RefreshCw className="h-4 w-4" />
                Guardar
              </Button>
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(draft.publicUrl).then(() => {
                    setCopyMessage("URL copiada");
                    setTimeout(() => setCopyMessage(""), 2000);
                  })
                }
              >
                <Settings className="h-4 w-4" />
                {copyMessage || "Copiar URL"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <div className="space-y-6">
            <div className="glass-card rounded-[34px] p-5">
              <h2 className="text-sm font-semibold text-white">Datos del evento</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(event) => handleUpdateField("title", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Título del evento"
                />
                <input
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                      publicUrl: buildEventUrl(slugify(event.target.value)),
                      qrLabel: `nilo.cam/${slugify(event.target.value)}`,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="slug"
                />
                <input
                  value={draft.dateLabel}
                  onChange={(event) => handleUpdateField("dateLabel", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Fecha"
                />
                <input
                  value={draft.venue}
                  onChange={(event) => handleUpdateField("venue", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Lugar"
                />
                <input
                  value={draft.organizer}
                  onChange={(event) => handleUpdateField("organizer", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Dueño del evento"
                />
                <input
                  value={draft.maxPhotoMb}
                  type="number"
                  min={1}
                  onChange={(event) => handleUpdateField("maxPhotoMb", Number(event.target.value))}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Máximo MB"
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  value={draft.eventType}
                  onChange={(event) => handleTypeChange(event.target.value as EventRecord["eventType"])}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                >
                  {getEventTypes().map((type) => (
                    <option key={type.key} value={type.key} className="text-slate-950">
                      {type.label}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.visibility}
                  onChange={(event) =>
                    handleUpdateField("visibility", event.target.value as EventVisibility)
                  }
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="moderated" className="text-slate-950">
                    Con moderación
                  </option>
                  <option value="public" className="text-slate-950">
                    Publicación directa
                  </option>
                </select>
              </div>
            </div>

            <div className="glass-card rounded-[34px] p-5">
              <h2 className="text-sm font-semibold text-white">Constructor de landing</h2>
              <p className="mt-1 text-xs text-white/50">
                Puedes ocultar o reordenar secciones para que cada evento tenga su estructura.
              </p>
              <div className="mt-4 space-y-3">
                {draft.landingSections.map((section, index) => (
                  <div key={section.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{section.title}</p>
                        <p className="mt-1 text-xs text-white/50">{section.body}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-xl border border-white/10 bg-black/15 p-2 text-white/70"
                          onClick={() => moveSection(section.id, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-xl border border-white/10 bg-black/15 p-2 text-white/70"
                          onClick={() => moveSection(section.id, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <Button tone={section.enabled ? "secondary" : "ghost"} onClick={() => handleSectionToggle(section.id)}>
                          {section.enabled ? "Visible" : "Oculta"}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/35">
                      Bloque {index + 1} · {section.kind}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <QRCodeCard
              url={draft.publicUrl}
              label={draft.qrLabel}
              onCopy={(value) =>
                navigator.clipboard.writeText(value).then(() => setCopyMessage("URL del QR copiada"))
              }
            />

            <div className="glass-card rounded-[34px] p-5">
              <h2 className="text-sm font-semibold text-white">Resumen del evento</h2>
              <div className="mt-4 grid gap-3 text-sm text-white/70">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Landing</p>
                  <p className="mt-1">{draft.heroTagline}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Fotos</p>
                  <p className="mt-1">
                    {draft.visibility === "public"
                      ? "Se publican al instante"
                      : "Primero pasan por moderación"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Upload</p>
                  <p className="mt-1">Límite configurable de {draft.maxPhotoMb} MB por foto.</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[34px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Fotos actuales</p>
                  <p className="text-xs text-white/50">Total: {selectedPhotos.length}</p>
                </div>
                <Button tone="secondary">
                  <Eye className="h-4 w-4" />
                  Previsualizar
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {selectedPhotos.slice(0, 4).map((photo) => (
                  <div key={photo.id} className="flex gap-3 rounded-[22px] border border-white/10 bg-white/5 p-3">
                    <img src={photo.src} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{photo.authorName}</p>
                      <p className="text-xs text-white/45">{photo.status} · {photo.note || "Sin nota"}</p>
                    </div>
                    <Button tone="ghost" className="ml-auto h-10 w-10 px-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
