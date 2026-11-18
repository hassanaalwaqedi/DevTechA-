import { NextResponse } from "next/server";
import { getSynchronizedAvailability } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tz = (searchParams.get("tz") || "UTC").trim().slice(0, 64);
  const availability = await getSynchronizedAvailability(tz);
  return NextResponse.json(availability, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
