import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

export async function POST(request: Request) {
  const event = (await request.json()) as EventRecord;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase not configured" }, { status: 200 });
  }

  const { error } = await supabase.from("events").upsert({
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

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

