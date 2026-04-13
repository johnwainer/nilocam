import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ ok: false, reason: "Not used in this build." }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, reason: "Not used in this build." }, { status: 404 });
}
