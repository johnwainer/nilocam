import type { EventRecord, EventStore, PhotoRecord } from "@/lib/types";
import { initialStore } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchStoreFromSupabase } from "@/lib/supabase/data";

const STORAGE_KEY = "nilo-cam-store";
const CHANNEL_NAME = "nilo-cam-live";
let broadcastChannel: BroadcastChannel | null = null;

type Listener = (store: EventStore) => void;

function isBrowser() {
  return typeof window !== "undefined";
}

function readStorage(): EventStore {
  if (!isBrowser()) {
    return initialStore;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return initialStore;
  }

  try {
    return JSON.parse(raw) as EventStore;
  } catch {
    return initialStore;
  }
}

function writeStorage(store: EventStore) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getStore() {
  return readStorage();
}

export function getEventBySlug(slug: string): EventRecord | undefined {
  return readStorage().events.find((event) => event.slug === slug);
}

export function getPhotosBySlug(slug: string) {
  return readStorage()
    .photos.filter((photo) => photo.eventSlug === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveEvent(nextEvent: EventRecord) {
  const store = readStorage();
  const index = store.events.findIndex((event) => event.slug === nextEvent.slug);

  if (index >= 0) {
    store.events[index] = nextEvent;
  } else {
    store.events.unshift(nextEvent);
  }

  writeStorage(store);
  broadcast(store);
  void syncEventToSupabase(nextEvent);
}

export function savePhoto(photo: PhotoRecord) {
  const store = readStorage();
  store.photos.unshift(photo);
  writeStorage(store);
  broadcast(store);
  void syncPhotoToSupabase(photo);
}

export function updatePhotoStatus(photoId: string, status: PhotoRecord["status"]) {
  const store = readStorage();
  const index = store.photos.findIndex((photo) => photo.id === photoId);
  if (index < 0) return;

  store.photos[index] = { ...store.photos[index], status };
  writeStorage(store);
  broadcast(store);
  void syncPhotoStatusToSupabase(photoId, status);
}

export function removePhoto(photoId: string) {
  const store = readStorage();
  store.photos = store.photos.filter((photo) => photo.id !== photoId);
  writeStorage(store);
  broadcast(store);
  void deletePhotoFromSupabase(photoId);
}

export function saveStore(store: EventStore) {
  writeStorage(store);
  broadcast(store);
}

export function updateEventPhotos(slug: string, updater: (photos: PhotoRecord[]) => PhotoRecord[]) {
  const store = readStorage();
  store.photos = updater(store.photos.filter((photo) => photo.eventSlug === slug)).concat(
    store.photos.filter((photo) => photo.eventSlug !== slug),
  );
  writeStorage(store);
  broadcast(store);
}

function broadcast(store: EventStore) {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event("nilo-cam-store"));
  broadcastChannel ??= getBroadcastChannel();
  broadcastChannel?.postMessage(store);
}

function getBroadcastChannel() {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function subscribeToStore(listener: Listener) {
  if (!isBrowser()) return () => undefined;

  const onStorage = () => listener(readStorage());
  const onCustom = () => listener(readStorage());
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
  const supabase = createSupabaseBrowserClient();
  const realtime = supabase
    ? supabase
        .channel("nilo-cam-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "events" },
          () => void fetchStoreFromSupabase().then(listener),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "photos" },
          () => void fetchStoreFromSupabase().then(listener),
        )
        .subscribe()
    : null;

  window.addEventListener("storage", onStorage);
  window.addEventListener("nilo-cam-store", onCustom);
  channel?.addEventListener("message", onCustom);
  void fetchStoreFromSupabase().then(listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("nilo-cam-store", onCustom);
    channel?.removeEventListener("message", onCustom);
    channel?.close();
    if (supabase && realtime) {
      void supabase.removeChannel(realtime);
    }
  };
}

async function syncEventToSupabase(event: EventRecord) {
  const client = createSupabaseBrowserClient();
  if (client) {
    try {
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
      return;
    } catch {
      // Fall through to the API route.
    }
  }

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Local-first fallback keeps the app usable even if Supabase is not configured yet.
  }
}

async function syncPhotoToSupabase(photo: PhotoRecord) {
  const client = createSupabaseBrowserClient();
  if (client) {
    try {
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
      return;
    } catch {
      // Fall through to the API route.
    }
  }

  try {
    await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(photo),
    });
  } catch {
    // Local-first fallback keeps the app usable even if Supabase is not configured yet.
  }
}

async function syncPhotoStatusToSupabase(photoId: string, status: PhotoRecord["status"]) {
  const client = createSupabaseBrowserClient();
  if (client) {
    try {
      await client.from("photos").update({ status }).eq("id", photoId);
      return;
    } catch {
      // Fall through to API route.
    }
  }

  try {
    await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch {
    // Local-first fallback.
  }
}

async function deletePhotoFromSupabase(photoId: string) {
  const client = createSupabaseBrowserClient();
  if (client) {
    try {
      await client.from("photos").delete().eq("id", photoId);
      return;
    } catch {
      // Fall through to API route.
    }
  }

  try {
    await fetch(`/api/photos/${photoId}`, {
      method: "DELETE",
    });
  } catch {
    // Local-first fallback.
  }
}
