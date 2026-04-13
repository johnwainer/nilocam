import { notFound } from "next/navigation";
import { EventLanding } from "@/components/event-landing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRecord, PhotoRecord } from "@/types";
import { publicStorageUrl } from "@/lib/utils";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!event) notFound();

  const currentEvent = event as EventRecord;
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", currentEvent.id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  const preparedPhotos = ((photos ?? []) as PhotoRecord[]).map((photo) => ({
    ...photo,
    public_url: publicStorageUrl(photo.storage_path),
  }));

  return <EventLanding event={currentEvent} initialPhotos={preparedPhotos} />;
}
