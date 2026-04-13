"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { QRCodeCard } from "@/components/qr-code-card";
import { Button } from "@/components/button";
import { BrandMark } from "@/components/brand-mark";
import { buildThemeSeed, createDefaultSections, getEventType, getEventTypes } from "@/lib/event-types";
import { saveEvent } from "@/lib/browser-store";
import { buildEventUrl } from "@/lib/site";
import type { EventRecord, EventStore, EventVisibility } from "@/lib/types";
import { clampText, slugify } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  RefreshCw,
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
    saveEvent(next);
    setStore((current) => ({ ...current, events: [next, ...current.events] }));
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
    <div className="mx-auto grid min-h-screen max-w-[1560px] gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
      <aside className="space-y-5">
        <div className="panel reveal rounded-[34px] p-5">
          <BrandMark compact />
          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Admin</p>
              <p className="text-lg font-semibold text-black">Eventos y QR</p>
            </div>
            <Button tone="secondary" onClick={handleCreateEvent}>
              <Plus className="h-4 w-4" />
              Crear
            </Button>
          </div>
        </div>

        <div className="panel reveal reveal-delay-1 rounded-[34px] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Eventos</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-scroll snap-x snap-mandatory">
            {store.events.map((event) => (
              <button
                key={event.id}
                className={`min-w-[240px] snap-start rounded-[24px] border px-4 py-4 text-left transition ${
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
                <p
                  className={
                    selectedEvent?.slug === event.slug
                      ? "mt-1 text-xs text-white/70"
                      : "mt-1 text-xs text-[var(--app-muted)]"
                  }
                >
                  {event.qrLabel}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel reveal reveal-delay-2 rounded-[34px] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <Sparkles className="h-4 w-4" />
            Tipos iniciales
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 snap-scroll snap-x snap-mandatory">
            {getEventTypes().map((type) => (
              <div
                key={type.key}
                className="min-w-[180px] snap-start rounded-2xl border border-[var(--app-border)] bg-black/3 p-3"
              >
                <p className="text-xs font-semibold text-black">{type.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
                  {clampText(type.description, 74)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="panel reveal rounded-[34px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Constructor visual</p>
              <h1 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-semibold text-black lg:text-5xl">
                {draft.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
                Cada evento puede tener su landing propia, sus CTAs y su comportamiento de
                publicación directa o moderada.
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
                    setTimeout(() => setCopyMessage(""), 1800);
                  })
                }
              >
                {copyMessage || "Copiar URL"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
          <div className="space-y-6">
            <div className="panel reveal reveal-delay-1 rounded-[34px] p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-black">Datos del evento</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(event) => handleUpdateField("title", event.target.value)}
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                  placeholder="Título del evento"
                />
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
                  value={draft.dateLabel}
                  onChange={(event) => handleUpdateField("dateLabel", event.target.value)}
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                  placeholder="Fecha"
                />
                <input
                  value={draft.venue}
                  onChange={(event) => handleUpdateField("venue", event.target.value)}
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                  placeholder="Lugar"
                />
                <input
                  value={draft.organizer}
                  onChange={(event) => handleUpdateField("organizer", event.target.value)}
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                  placeholder="Dueño del evento"
                />
                <input
                  value={draft.maxPhotoMb}
                  type="number"
                  min={1}
                  onChange={(event) => handleUpdateField("maxPhotoMb", Number(event.target.value))}
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                  placeholder="Máximo MB"
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
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
                    handleUpdateField("visibility", event.target.value as EventVisibility)
                  }
                  className="rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none"
                >
                  <option value="moderated">Con moderación</option>
                  <option value="public">Publicación directa</option>
                </select>
              </div>
            </div>

            <div className="panel reveal reveal-delay-2 rounded-[34px] p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-black">Constructor del landing</h2>
              <p className="mt-2 text-xs text-[var(--app-muted)]">
                Reordena, oculta o muestra secciones para adaptar cada evento.
              </p>
              <div className="mt-5 space-y-4">
                {draft.landingSections.map((section, index) => (
                  <div key={section.id} className="rounded-[28px] border border-[var(--app-border)] bg-white p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-black">{section.title}</p>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">{section.body}</p>
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
                        <Button tone={section.enabled ? "secondary" : "ghost"} onClick={() => handleSectionToggle(section.id)}>
                          {section.enabled ? "Visible" : "Oculta"}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[var(--app-muted)]">
                      Bloque {index + 1} · {section.kind}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
              <h2 className="text-sm font-semibold text-black">Resumen</h2>
              <div className="mt-5 grid gap-3 text-sm text-black">
                <div className="rounded-2xl border border-[var(--app-border)] bg-black/3 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Landing</p>
                  <p className="mt-1">{draft.heroTagline}</p>
                </div>
                <div className="rounded-2xl border border-[var(--app-border)] bg-black/3 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Fotos</p>
                  <p className="mt-1">
                    {draft.visibility === "public"
                      ? "Se publican al instante"
                      : "Primero pasan por moderación"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--app-border)] bg-black/3 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Límite</p>
                  <p className="mt-1">Máximo {draft.maxPhotoMb} MB por foto.</p>
                </div>
              </div>
            </div>

            <div className="panel reveal reveal-delay-3 rounded-[34px] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-black">Fotos actuales</p>
                  <p className="text-xs text-[var(--app-muted)]">Total: {selectedPhotos.length}</p>
                </div>
                <Button tone="secondary">
                  <Eye className="h-4 w-4" />
                  Previsualizar
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {selectedPhotos.slice(0, 4).map((photo) => (
                  <div key={photo.id} className="flex gap-3 rounded-[24px] border border-[var(--app-border)] bg-white p-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image src={photo.src} alt="" fill unoptimized className="object-cover" sizes="64px" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{photo.authorName}</p>
                      <p className="text-xs text-[var(--app-muted)]">
                        {photo.status} · {photo.note || "Sin nota"}
                      </p>
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
