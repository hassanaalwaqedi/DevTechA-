import type { Metadata } from "next";
import "./scheduler.css";
import { CandidateSchedulerClient } from "@/components/interview/CandidateSchedulerClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule Your Interview | HIRZEXA Talent Acquisition",
  description:
    "Securely select and confirm your HIRZEXA interview appointment in your local time zone.",
  robots: { index: false, follow: false },
};

export default async function CandidateInterviewSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";
  return <CandidateSchedulerClient token={token} />;
}
