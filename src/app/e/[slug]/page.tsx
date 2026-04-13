import { notFound } from "next/navigation";
import { EventLanding } from "@/components/event-landing";
import { fetchEventBySlug, fetchPhotosBySlug } from "@/lib/supabase/data";

type Params = {
  slug: string;
};

export default async function EventPage({ params }: { params: Params }) {
  const [event, photos] = await Promise.all([
    fetchEventBySlug(params.slug),
    fetchPhotosBySlug(params.slug),
  ]);

  if (!event) {
    notFound();
  }

  return <EventLanding initialEvent={event} initialPhotos={photos} />;
}
