"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Calendar, FileText, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function StickyBookingBar() {
  const pathname = usePathname();
  const ar = useLanguage() === "ar";
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isHiddenRoute =
    pathname?.startsWith("/admin") ||
    pathname === "/book" ||
    pathname?.includes("/apply");

  useEffect(() => {
    if (isHiddenRoute || dismissed) return;
    function onScroll() {
      setVisible(window.scrollY > 520);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHiddenRoute, dismissed]);

  if (isHiddenRoute || dismissed || !visible) return null;

  const bookingHref = pathname === "/" ? "#book-discovery" : "/book";

  return (
    <aside
      className="dt-sticky-booking-bar"
      aria-label={ar ? "حجز جلسة اكتشاف سريعة" : "Quick discovery call booking"}
    >
      <div className="dt-sticky-booking-inner">
        <div className="dt-sticky-booking-copy">
          <span className="dt-sticky-booking-dot" aria-hidden="true" />
          <div>
            <strong>
              {ar
                ? "هل تخطط لمشروع ذكاء اصطناعي أو نظام برمجي؟"
                : "Planning an AI, automation, or custom software project?"}
            </strong>
            <span>
              {ar
                ? "استشارة هندسية 20–30 دقيقة · تحديد النطاق والمعمارية"
                : "20–30 min engineering consultation · Architecture & proposal scoping"}
            </span>
          </div>
        </div>

        <div className="dt-sticky-booking-actions">
          <Link
            href="/book?mode=proposal"
            className="dt-sticky-booking-secondary"
          >
            <FileText size={14} />
            <span>{ar ? "اطلب عرضاً فنياً" : "Request a Proposal"}</span>
          </Link>

          <Link href={bookingHref} className="dt-sticky-booking-primary">
            <Calendar size={14} />
            <span>{ar ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}</span>
            <ArrowUpRight size={15} />
          </Link>

          <button
            type="button"
            className="dt-sticky-booking-close"
            onClick={() => setDismissed(true)}
            aria-label={ar ? "إخفاء شريط الحجز" : "Dismiss booking bar"}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
