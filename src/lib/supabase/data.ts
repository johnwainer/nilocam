import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildThemeSeed, createDefaultSections, getEventType } from "@/lib/event-types";
import { buildEventUrl } from "@/lib/site";
import type { EventRecord, EventStore, PhotoRecord } from "@/lib/types";
import { initialStore } from "@/lib/mock-data";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  event_type: EventRecord["eventType"];
  date_label: string;
  venue: string;
  organizer: string;
  public_url: string;
  qr_label: string;
  visibility: EventRecord["visibility"];
  allow_anonymous: boolean;
  require_guest_name: boolean;
  max_photo_mb: number;
  highlight_limit: number;
  logo_text: string;
  hero_tagline: string;
  landing_sections: EventRecord["landingSections"];
  ctas: EventRecord["ctas"];
  theme: EventRecord["theme"];
};

type PhotoRow = {
  id: string;
  event_slug: string;
  src: string;
  author_name: string;
  anonymous: boolean;
  note: string;
  status: PhotoRecord["status"];
  filter: PhotoRecord["filter"];
  template: PhotoRecord["template"];
  created_at: string;
};

function mapEvent(row: EventRow): EventRecord {
  const type = getEventType(row.event_type);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    dateLabel: row.date_label,
    venue: row.venue,
    organizer: row.organizer,
    publicUrl: row.public_url || buildEventUrl(row.slug),
    qrLabel: row.qr_label || `nilo.cam/${row.slug}`,
    theme: row.theme || buildThemeSeed(row.event_type),
    visibility: row.visibility,
    allowAnonymous: row.allow_anonymous,
    requireGuestName: row.require_guest_name,
    maxPhotoMb: row.max_photo_mb,
    highlightLimit: row.highlight_limit,
    logoText: row.logo_text,
    heroTagline: row.hero_tagline || type.defaultTagline,
    landingSections:
      row.landing_sections?.length > 0 ? row.landing_sections : createDefaultSections(row.event_type),
    ctas: row.ctas || type.ctas,
  };
}

function mapPhoto(row: PhotoRow): PhotoRecord {
  return {
    id: row.id,
    eventSlug: row.event_slug,
    src: row.src,
    authorName: row.author_name,
    anonymous: row.anonymous,
    note: row.note,
    status: row.status,
    filter: row.filter,
    template: row.template,
    createdAt: row.created_at,
  };
}

export async function fetchStoreFromSupabase(): Promise<EventStore> {
  const server = createSupabaseServerClient();
  if (!server) return initialStore;

  const [eventsResult, photosResult] = await Promise.all([
    server.from("events").select("*").order("created_at", { ascending: false }),
    server.from("photos").select("*").order("created_at", { ascending: false }),
  ]);

  if (eventsResult.error || photosResult.error) {
    return initialStore;
  }

  const events = (eventsResult.data ?? []).map((row) => mapEvent(row as EventRow));
  const photos = (photosResult.data ?? []).map((row) => mapPhoto(row as PhotoRow));

  return events.length > 0 ? { events, photos } : initialStore;
}

export async function fetchEventBySlug(slug: string) {
  const store = await fetchStoreFromSupabase();
  return store.events.find((event) => event.slug === slug);
}

export async function fetchPhotosBySlug(slug: string) {
  const store = await fetchStoreFromSupabase();
  return store.photos.filter((photo) => photo.eventSlug === slug);
}

export async function syncEventToSupabase(event: EventRecord) {
  const client = createSupabaseBrowserClient();
  if (!client) return;

  await client.from("events").upsert({
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    event_type: event.eventType,
    date_label: event.dateLabel,
    venue: event.venue,
    organizer: event.organizer,
    public_url: event.publicUrl,
    qr_label: event.qrLabel,
    visibility: event.visibility,
    allow_anonymous: event.allowAnonymous,
    require_guest_name: event.requireGuestName,
    max_photo_mb: event.maxPhotoMb,
    highlight_limit: event.highlightLimit,
    logo_text: event.logoText,
    hero_tagline: event.heroTagline,
    landing_sections: event.landingSections,
    ctas: event.ctas,
    theme: event.theme,
    updated_at: new Date().toISOString(),
  });
}

export async function syncPhotoToSupabase(photo: PhotoRecord) {
  const client = createSupabaseBrowserClient();
  if (!client) return;

  await client.from("photos").insert({
    id: photo.id,
    event_slug: photo.eventSlug,
    src: photo.src,
    author_name: photo.authorName,
    anonymous: photo.anonymous,
    note: photo.note,
    status: photo.status,
    filter: photo.filter,
    template: photo.template,
    created_at: photo.createdAt,
  });
}

