import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, reason: "Use the Supabase-backed admin UI instead." }, { status: 404 });
}
