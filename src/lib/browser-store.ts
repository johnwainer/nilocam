/* eslint-disable @typescript-eslint/no-unused-vars */
// Legacy compatibility layer from the old starter.
// The production flow now uses Supabase directly from the event landing and admin pages.

import type { EventStore, EventRecord, PhotoRecord } from "@/lib/types";

export function getStore(): EventStore {
  return { events: [], photos: [] };
}

export function getEventBySlug(_slug: string): EventRecord | undefined {
  return undefined;
}

export function getPhotosBySlug(_slug: string): PhotoRecord[] {
  return [];
}

export function saveEvent(_event: EventRecord) {}

export function savePhoto(_photo: PhotoRecord) {}

export function updatePhotoStatus(_photoId: string, _status: PhotoRecord["status"]) {}

export function removePhoto(_photoId: string) {}

export function saveStore(_store: EventStore) {}

export function updateEventPhotos(_slug: string, _updater: (photos: PhotoRecord[]) => PhotoRecord[]) {}

export function subscribeToStore(_listener: (store: EventStore) => void) {
  return () => undefined;
}
