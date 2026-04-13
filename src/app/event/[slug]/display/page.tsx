import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GalleryDisplay } from "@/components/gallery-display";
import type { EventRecord, PhotoRecord } from "@/types";
import { publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!event) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", (event as EventRecord).id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: true })
    .limit(200);

  const preparedPhotos = ((photos ?? []) as PhotoRecord[]).map((p) => ({
    ...p,
    public_url: publicStorageUrl(p.storage_path),
  }));

  return (
    <GalleryDisplay
      event={event as EventRecord}
      initialPhotos={preparedPhotos}
    />
  );
}
