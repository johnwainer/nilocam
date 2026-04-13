import type { EventRecord, EventStore, PhotoRecord } from "@/lib/types";
import { initialStore } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchStoreFromSupabase,
  syncEventToSupabase,
  syncPhotoToSupabase,
} from "@/lib/supabase/data";

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
