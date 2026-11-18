import { NextResponse } from "next/server";
import { getPublishedDemoConfig } from "@/lib/demo-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const published = await getPublishedDemoConfig();
  return NextResponse.json(
    { ok: true, config: published },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
