import { NextResponse } from "next/server";

export const runtime = "nodejs";

const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({error: "Invalid form submission."}, {status: 400}); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const workEmail = typeof body.email === "string" ? body.email.trim() : "";
  const overview = typeof body.overview === "string" ? body.overview.trim() : "";
  if (typeof body.website === "string" && body.website) return NextResponse.json({ok: true});
  if (!name || !email.test(workEmail) || overview.length < 20) return NextResponse.json({error: "Please provide your name, a valid work email, and a project overview of at least 20 characters."}, {status: 400});
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({error: "Enquiry delivery is not configured yet. Please email hello@devtech.ai."}, {status: 503});
  try {
    const response = await fetch(webhook, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name, email: workEmail, company: body.company || "", category: body.category || "", budget: body.budget || "", overview, source: "DevTech AI website"}), signal: AbortSignal.timeout(10_000)});
    if (!response.ok) throw new Error("Webhook delivery failed");
  } catch { return NextResponse.json({error: "Your enquiry could not be delivered. Please email hello@devtech.ai."}, {status: 502}); }
  return NextResponse.json({ok: true});
}
