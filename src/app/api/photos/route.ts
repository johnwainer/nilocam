import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PhotoRecord } from "@/lib/types";

export async function POST(request: Request) {
  const photo = (await request.json()) as PhotoRecord;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase not configured" }, { status: 200 });
  }

  const { error } = await supabase.from("photos").insert({
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

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

