import { cookies } from "next/headers";

export type Locale = "en" | "ar";

export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("devtech_locale")?.value === "ar" ? "ar" : "en";
}
