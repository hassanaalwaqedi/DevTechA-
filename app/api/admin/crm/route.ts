import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { listCrmLeads } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stage = (searchParams.get("stage") || "").trim();
  const query = (searchParams.get("query") || "").trim().toLowerCase();

  let leads = await listCrmLeads();
  if (stage && stage !== "all") {
    leads = leads.filter((item) => item.stage === stage);
  }
  if (query) {
    leads = leads.filter(
      (item) =>
        item.fullName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.referenceId.toLowerCase().includes(query) ||
        item.serviceTrack.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({ leads });
}
