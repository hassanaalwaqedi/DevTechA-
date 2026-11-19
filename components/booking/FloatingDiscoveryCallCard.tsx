"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Calendar, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { GradientButton } from "@/components/ui/GradientButton";

const STORAGE_KEY = "hirzexa:floating-discovery-card:v1";
const APPEAR_DELAY_MS = 5000;
const AUTO_COLLAPSE_MS = 12000;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type CardViewState = "hidden" | "expanded" | "collapsed";

type StoredInvitationState = {
  lastAutoShownAt?: number;
  dismissedAt?: number;
};

function readStoredState(): StoredInvitationState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredInvitationState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredState(patch: Partial<StoredInvitationState>) {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredState();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...patch })
    );
  } catch {
    // Ignore private browsing / quota storage errors
  }
}

function isWithinCooldown(state: StoredInvitationState): boolean {
  const now = Date.now();
  const lastTouch = Math.max(state.lastAutoShownAt || 0, state.dismissedAt || 0);
  return lastTouch > 0 && now - lastTouch < COOLDOWN_MS;
}

export function FloatingDiscoveryCallCard() {
  const pathname = usePathname();
  const locale = useLanguage();
  const ar = locale === "ar";

  const [mounted, setMounted] = useState(false);
  const [viewState, setViewState] = useState<CardViewState>("hidden");
  const [autoCollapseActive, setAutoCollapseActive] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);
  const [bookingSectionInView, setBookingSectionInView] = useState(false);
  const [stickyBarActive, setStickyBarActive] = useState(false);

  const launcherBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const wasAutoTriggeredRef = useRef(false);

  const isExcludedRoute =
    !pathname ||
    pathname.startsWith("/admin") ||
    pathname === "/book" ||
    pathname.startsWith("/book/") ||
    pathname.includes("/apply");

  const isHomePage = pathname === "/";

  // Hydrate safely on client only (prevents SSR hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track Cookie Consent Banner visibility so the two never overlap
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const syncCookieBanner = () => {
      setCookieBannerOpen(
        document.documentElement.dataset.cookieBannerOpen === "true"
      );
    };
    syncCookieBanner();

    const observer = new MutationObserver(syncCookieBanner);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-cookie-banner-open"],
    });
    return () => observer.disconnect();
  }, [mounted]);

  // Track when the embedded booking section (#book-discovery) is visible on screen
  useEffect(() => {
    if (!mounted || isExcludedRoute || typeof document === "undefined") {
      setBookingSectionInView(false);
      return;
    }

    const bookingEl = document.getElementById("book-discovery");
    if (!bookingEl || typeof IntersectionObserver === "undefined") {
      setBookingSectionInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setBookingSectionInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.08 }
    );
    observer.observe(bookingEl);
    return () => observer.disconnect();
  }, [mounted, isExcludedRoute, pathname]);

  // Track StickyBookingBar scroll presence so compact launcher lifts cleanly on narrow screens
  useEffect(() => {
    if (!mounted || isExcludedRoute || typeof window === "undefined") return;
    const onScroll = () => {
      setStickyBarActive(window.scrollY > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, isExcludedRoute]);

  // Coordinate with StickyBookingBar: hide sticky bar while floating card is expanded
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isExpandedVisible =
      mounted &&
      !isExcludedRoute &&
      !cookieBannerOpen &&
      !bookingSectionInView &&
      viewState === "expanded";

    if (isExpandedVisible) {
      document.documentElement.dataset.discoveryCardOpen = "true";
    } else {
      delete document.documentElement.dataset.discoveryCardOpen;
    }
    return () => {
      delete document.documentElement.dataset.discoveryCardOpen;
    };
  }, [mounted, isExcludedRoute, cookieBannerOpen, bookingSectionInView, viewState]);

  // Homepage 5-second auto-appearance with 7-day frequency cap
  useEffect(() => {
    if (!mounted || isExcludedRoute) {
      setViewState("hidden");
      return;
    }

    const stored = readStoredState();
    const inCooldown = isWithinCooldown(stored);

    // Non-homepage pages or within 7-day cooldown: show quiet launcher only
    if (!isHomePage || inCooldown) {
      setViewState((prev) => (prev === "expanded" ? prev : "collapsed"));
      return;
    }

    // Pause the 5-second homepage timer while cookie banner or booking section is visible
    if (cookieBannerOpen || bookingSectionInView) {
      return;
    }

    // Already triggered in this session
    if (wasAutoTriggeredRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      wasAutoTriggeredRef.current = true;
      writeStoredState({ lastAutoShownAt: Date.now() });
      setAutoCollapseActive(true);
      setViewState("expanded");
    }, APPEAR_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [mounted, isExcludedRoute, isHomePage, cookieBannerOpen, bookingSectionInView]);

  // Auto-collapse into compact calendar launcher after 12 seconds if ignored
  useEffect(() => {
    if (
      viewState !== "expanded" ||
      !autoCollapseActive ||
      isInteracting ||
      cookieBannerOpen ||
      bookingSectionInView
    ) {
      return;
    }

    const collapseTimer = window.setTimeout(() => {
      setAutoCollapseActive(false);
      setViewState("collapsed");
    }, AUTO_COLLAPSE_MS);

    return () => window.clearTimeout(collapseTimer);
  }, [
    viewState,
    autoCollapseActive,
    isInteracting,
    cookieBannerOpen,
    bookingSectionInView,
  ]);

  const handleClose = useCallback(() => {
    writeStoredState({ dismissedAt: Date.now() });
    setAutoCollapseActive(false);
    setViewState("collapsed");
    window.requestAnimationFrame(() => {
      launcherBtnRef.current?.focus();
    });
  }, []);

  const handleReopen = useCallback(() => {
    setAutoCollapseActive(false);
    setViewState("expanded");
  }, []);

  // Keyboard Escape closes expanded card back to launcher
  useEffect(() => {
    if (viewState !== "expanded") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewState, handleClose]);

  if (
    !mounted ||
    isExcludedRoute ||
    cookieBannerOpen ||
    bookingSectionInView ||
    viewState === "hidden"
  ) {
    return null;
  }

  return (
    <div
      className={`dt-float-discovery-root ${
        stickyBarActive && viewState === "collapsed" ? "is-above-sticky" : ""
      }`}
      dir={ar ? "rtl" : "ltr"}
    >
      {viewState === "expanded" ? (
        <aside
          ref={cardRef}
          className="dt-float-discovery-card"
          role="region"
          aria-label={ar ? "دعوة لحجز جلسة اكتشاف" : "Discovery call invitation"}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onFocusCapture={() => setIsInteracting(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsInteracting(false);
            }
          }}
        >
          <div className="dt-float-discovery-accent-bar" aria-hidden="true" />

          <div className="dt-float-discovery-head">
            <span className="dt-float-discovery-icon" aria-hidden="true">
              <Calendar size={18} strokeWidth={2.1} />
            </span>

            <button
              type="button"
              className="dt-float-discovery-close"
              onClick={handleClose}
              aria-label={ar ? "إغلاق الدعوة" : "Close invitation"}
            >
              <X size={15} />
            </button>
          </div>

          <div className="dt-float-discovery-body">
            <h3>{ar ? "لديك مشروع أو فكرة؟" : "Have a Project in Mind?"}</h3>
            <p>
              {ar
                ? "اكتشف كيف يمكن لفريق HIRZEXA تحويل فكرتك إلى حل برمجي متكامل."
                : "Let's explore how HIRZEXA can help bring your ideas to life."}
            </p>
          </div>

          <GradientButton
            href="/book"
            variant="primary"
            className="dt-float-discovery-cta"
            onClick={() => {
              writeStoredState({ dismissedAt: Date.now() });
              setAutoCollapseActive(false);
              setViewState("collapsed");
            }}
          >
            <span>
              {ar ? "احجز جلسة اكتشاف ←" : "Book a Discovery Call →"}
            </span>
          </GradientButton>

          <div className="dt-float-discovery-foot">
            <span className="dt-float-discovery-live-dot" aria-hidden="true" />
            <span>
              {ar
                ? "اجتماع عن بُعد · دون التزام"
                : "Online meeting · No obligation"}
            </span>
          </div>

          {autoCollapseActive && !isInteracting ? (
            <div className="dt-float-discovery-timer-track" aria-hidden="true">
              <span className="dt-float-discovery-timer-fill" />
            </div>
          ) : null}
        </aside>
      ) : (
        <button
          ref={launcherBtnRef}
          type="button"
          className="dt-float-discovery-launcher"
          onClick={handleReopen}
          aria-label={ar ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}
          title={ar ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}
        >
          <span className="dt-float-discovery-launcher-pulse" aria-hidden="true" />
          <Calendar size={20} strokeWidth={2.1} aria-hidden="true" />
          <span className="dt-float-discovery-launcher-tooltip" aria-hidden="true">
            {ar ? "احجز جلسة اكتشاف" : "Book a Discovery Call"}
          </span>
        </button>
      )}
    </div>
  );
}
