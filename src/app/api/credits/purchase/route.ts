import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const PHOTO_PACK_SIZES: Record<string, number> = {
  photos_100: 100,
  photos_200: 200,
  photos_500: 500,
};

// POST /api/credits/purchase  { event_id, pack_key }
export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "No autenticado." }, { status: 401 });
  }

  const body = await request.json() as { event_id?: string; pack_key?: string };
  const { event_id, pack_key } = body;

  if (!event_id || !pack_key || !PHOTO_PACK_SIZES[pack_key]) {
    return NextResponse.json({ ok: false, message: "Parámetros inválidos." }, { status: 400 });
  }

  const admin = serviceClient();

  const [{ data: pricingRow }, { data: profile }, { data: event }] = await Promise.all([
    admin.from("credit_pricing").select("credits, label").eq("key", pack_key).single(),
    admin.from("profiles").select("id, credits").eq("email", user.email).single(),
    admin.from("events").select("id, slug, title, owner_email, photo_limit").eq("id", event_id).single(),
  ]);

  if (!event) {
    return NextResponse.json({ ok: false, message: "Evento no encontrado." }, { status: 404 });
  }

  // Only the event owner or super admin can buy packs for an event
  const { data: roleRow } = await admin.from("profiles").select("role").eq("email", user.email).single();
  const isSuperAdmin = roleRow?.role === "super_admin";
  if (event.owner_email !== user.email && !isSuperAdmin) {
    return NextResponse.json({ ok: false, message: "Sin acceso." }, { status: 403 });
  }

  const cost = pricingRow?.credits ?? 3;
  const currentCredits = profile?.credits ?? 0;

  if (currentCredits < cost) {
    return NextResponse.json({
      ok: false,
      message: `Créditos insuficientes. Necesitas ${cost} créditos (tienes ${currentCredits}).`,
      credits: currentCredits,
      cost,
    }, { status: 402 });
  }

  const photosToAdd = PHOTO_PACK_SIZES[pack_key];
  const newLimit = (event.photo_limit ?? 0) + photosToAdd;
  const newBalance = currentCredits - cost;

  // Update event photo_limit
  const { error: updateErr } = await admin
    .from("events")
    .update({ photo_limit: newLimit })
    .eq("id", event_id);

  if (updateErr) {
    return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });
  }

  // Deduct credits
  await admin.from("profiles").update({ credits: newBalance }).eq("id", profile!.id);

  // Log transaction
  await admin.from("credit_transactions").insert({
    user_id: profile!.id,
    user_email: user.email,
    amount: -cost,
    type: pack_key,
    event_id,
    event_slug: event.slug,
    description: `${pricingRow?.label ?? pack_key} para "${event.title}"`,
  });

  return NextResponse.json({ ok: true, photo_limit: newLimit, credits: newBalance, cost });
}
