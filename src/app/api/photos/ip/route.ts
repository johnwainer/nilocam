import { NextResponse, type NextRequest } from "next/server";

// GET /api/photos/ip — returns the caller's IP address.
// Called by photo-composer before inserting a photo record.
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown";
  return NextResponse.json({ ip });
}
