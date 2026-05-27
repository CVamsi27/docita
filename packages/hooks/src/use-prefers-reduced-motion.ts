import { useEffect, useState } from "react";

/**
 * Tracks the `prefers-reduced-motion` media query.
 *
 * Returns `true` when the user has asked the OS to minimize animation.
 * Components that would otherwise scroll, transition, or animate should
 * skip the motion (use `behavior: "auto"`, omit the framer-motion variant,
 * etc.) when this hook returns `true`.
 *
 * SSR-safe: starts as `false` and updates after mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

/**
 * Convenience: returns `"auto"` when reduced-motion is requested, otherwise
 * the supplied `behavior` (defaults to `"smooth"`). Designed for
 * `Element.scrollIntoView`, `Element.scrollTo`, and `Element.scrollBy`.
 */
export function useScrollBehavior(
  behavior: ScrollBehavior = "smooth",
): ScrollBehavior {
  const reduced = usePrefersReducedMotion();
  return reduced ? "auto" : behavior;
}
