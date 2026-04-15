import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EventRecord } from "@/types";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// POST /api/credits/event — create a new event, deducting event_creation credits
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const body = await request.json() as Partial<EventRecord>;
  if (!body.slug || !body.title) {
    return NextResponse.json({ ok: false, message: "Faltan datos del evento." }, { status: 400 });
  }

  const admin = serviceClient();

  // Fetch pricing + current credits in parallel
  const [{ data: pricingRow }, { data: profile }] = await Promise.all([
    admin.from("credit_pricing").select("credits").eq("key", "event_creation").single(),
    admin.from("profiles").select("id, credits").eq("email", user.email).single(),
  ]);

  const cost = pricingRow?.credits ?? 5;
  const currentCredits = profile?.credits ?? 0;

  if (currentCredits < cost) {
    return NextResponse.json({
      ok: false,
      message: `Créditos insuficientes. Necesitas ${cost} créditos para crear un evento (tienes ${currentCredits}).`,
      credits: currentCredits,
      cost,
    }, { status: 402 });
  }

  // Deduct credits + create event atomically (sequential under service role)
  const newBalance = currentCredits - cost;

  const { data: event, error: eventErr } = await admin
    .from("events")
    .insert({
      slug: body.slug,
      title: body.title,
      subtitle: body.subtitle,
      event_type_key: body.event_type_key,
      event_date: body.event_date,
      venue_name: body.venue_name,
      venue_city: body.venue_city,
      moderation_mode: body.moderation_mode,
      max_upload_mb: body.max_upload_mb,
      cover_image_url: body.cover_image_url,
      landing_config: body.landing_config,
      allow_guest_upload: body.allow_guest_upload,
      owner_email: user.email,
      is_active: true,
      photo_limit: 0,
    })
    .select("*")
    .single();

  if (eventErr) {
    return NextResponse.json({ ok: false, message: eventErr.message }, { status: 500 });
  }

  // Deduct credits
  await admin.from("profiles").update({ credits: newBalance }).eq("id", profile!.id);

  // Log transaction
  await admin.from("credit_transactions").insert({
    user_id: profile!.id,
    user_email: user.email,
    amount: -cost,
    type: "event_creation",
    event_id: event.id,
    event_slug: event.slug,
    description: `Creación de evento "${event.title}"`,
  });

  return NextResponse.json({ ok: true, event, credits: newBalance, cost });
}
