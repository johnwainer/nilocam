import { buildThemeSeed, createDefaultSections, getEventType } from "@/lib/event-types";
import { buildEventUrl } from "@/lib/site";
import type { EventRecord, EventStore, PhotoRecord } from "@/lib/types";

function makeEvent(slug: string, eventType: EventRecord["eventType"], title: string): EventRecord {
  const typeConfig = getEventType(eventType);
  return {
    id: crypto.randomUUID(),
    slug,
    title,
    description: typeConfig.description,
    eventType,
    dateLabel: "18 de abril de 2026",
    venue: "Casa del evento",
    organizer: "Nilo Cam Studio",
    publicUrl: buildEventUrl(slug),
    qrLabel: `nilo.cam/${slug}`,
    theme: buildThemeSeed(eventType),
    visibility: "moderated",
    allowAnonymous: true,
    requireGuestName: false,
    maxPhotoMb: 12,
    highlightLimit: 6,
    logoText: "Nilo Cam",
    heroTagline: typeConfig.defaultTagline,
    landingSections: createDefaultSections(eventType),
    ctas: typeConfig.ctas,
  };
}

const demoEvents: EventRecord[] = [
  makeEvent("fiesta-luna", "cumpleanos", "Fiesta de Luna"),
  makeEvent("boda-sara-andres", "matrimonio", "Sara + Andrés"),
];

const demoPhotos: PhotoRecord[] = [
  {
    id: crypto.randomUUID(),
    eventSlug: "fiesta-luna",
    src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    authorName: "Camila",
    anonymous: false,
    note: "Selfie con la cumpleañera",
    status: "published",
    filter: "warm",
    template: "polaroid",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    eventSlug: "fiesta-luna",
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
    authorName: "Invitado anónimo",
    anonymous: true,
    note: "La pista está llena",
    status: "published",
    filter: "vivid",
    template: "spotlight",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    eventSlug: "boda-sara-andres",
    src: "https://images.unsplash.com/photo-1523438097201-512ae7d59b8c?auto=format&fit=crop&w=1200&q=80",
    authorName: "Valentina",
    anonymous: false,
    note: "Brindis de la mesa 4",
    status: "pending",
    filter: "golden",
    template: "film",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

export const initialStore: EventStore = {
  events: demoEvents,
  photos: demoPhotos,
};
