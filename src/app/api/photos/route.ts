import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, reason: "Use the event landing upload flow instead." }, { status: 404 });
}
