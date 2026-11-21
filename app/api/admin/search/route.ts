import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { searchAuthorizedRecords } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let actor;
  try {
    ({ actor } = await requireAdminApi());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().slice(0, 120);

  if (query.length < 2) {
    return NextResponse.json({ ok: true, results: [], searchedModules: [] });
  }

  const { results, searchedModules } = await searchAuthorizedRecords(actor, query, 5);
  return NextResponse.json({
    ok: true,
    results,
    searchedModules,
    scope: actor.scope,
  });
}
