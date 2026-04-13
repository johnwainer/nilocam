import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRecord, PhotoRecord } from "@/types";

export type EventStore = {
  events: EventRecord[];
  photos: PhotoRecord[];
};

export async function fetchStoreFromSupabase(): Promise<EventStore> {
  const supabase = await createSupabaseServerClient();

  const [eventsResult, photosResult] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("photos").select("*").order("created_at", { ascending: false }),
  ]);

  return {
    events: (eventsResult.data ?? []) as EventRecord[],
    photos: (photosResult.data ?? []) as PhotoRecord[],
  };
}

export async function fetchEventBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  return (data ?? null) as EventRecord | null;
}

export async function fetchPhotosBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", slug)
    .order("created_at", { ascending: false });
  return (data ?? []) as PhotoRecord[];
}
