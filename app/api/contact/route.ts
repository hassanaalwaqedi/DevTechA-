import { NextResponse } from "next/server";
import { COMPANY_EMAILS, recipientForContactCategory } from "@/lib/company-emails";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const budgets = new Set(["", "Under $25k", "$25k–$75k", "$75k–$150k", "$150k+", "Prefer to discuss"]);
const maxBodyLength = 16_000;

function singleLine(value: unknown) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
}

function multiLine(value: unknown) {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim() : "";
}

function failure(error: string, status: number) {
  return NextResponse.json({ error, fallbackEmail: COMPANY_EMAILS.general }, { status });
}

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
  if (!checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many enquiries. Please try again later.", fallbackEmail: COMPANY_EMAILS.general }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) return failure("Invalid form submission.", 415);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBodyLength) return failure("Your enquiry is too long.", 413);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > maxBodyLength) return failure("Your enquiry is too long.", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failure("Invalid form submission.", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return failure("Invalid form submission.", 400);
  }

  if (singleLine(body.website)) return failure("Invalid form submission.", 400);
  const name = singleLine(body.name);
  const workEmail = singleLine(body.email);
  const company = singleLine(body.company);
  const category = singleLine(body.category);
  const budget = singleLine(body.budget);
  const overview = multiLine(body.overview);
  const recipient = recipientForContactCategory(category);
  if (!name || name.length > 100 || !emailPattern.test(workEmail) || workEmail.length > 254 || company.length > 120 || !recipient || !budgets.has(budget) || overview.length < 20 || overview.length > 3_000) {
    return failure("Please provide your name, a valid work email, and a project overview of 20–3000 characters.", 400);
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return failure("Enquiry delivery is not configured yet.", 503);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: workEmail, company, category, budget, overview, recipient: COMPANY_EMAILS[recipient], department: recipient, source: "HIRZEXA website" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return failure("Your enquiry could not be delivered.", 502);
  } catch {
    return failure("Your enquiry could not be delivered.", 502);
  }
  return NextResponse.json({ ok: true });
}
