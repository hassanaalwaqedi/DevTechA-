"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Content remains visible without JavaScript and when motion is reduced. */
export function ScrollMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll<HTMLElement>("main section:not(:first-child), main .motion-reveal");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove("motion-pending");
        entry.target.classList.add("motion-visible");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    targets.forEach((element) => {
      if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add("motion-pending");
      observer.observe(element);
    });
    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) { observer.disconnect(); targets.forEach((element) => element.classList.remove("motion-pending")); }
    };
    media.addEventListener("change", handleMotionChange);
    return () => { observer.disconnect(); media.removeEventListener("change", handleMotionChange); targets.forEach((element) => element.classList.remove("motion-pending", "motion-visible")); };
  }, [pathname]);
  return <div className="reading-progress" aria-hidden="true"><span/></div>;
}
