"use client";

import { useEffect, useState } from "react";

/**
 * Tailwind v4 default breakpoints (in pixels).
 * Keep in sync with `packages/ui/src/styles/globals.css` / Tailwind config.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const BREAKPOINT_ORDER: readonly Breakpoint[] = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
];

/**
 * Returns the largest matching breakpoint for the current viewport, or null on
 * the server (and before hydration). Use for layout decisions that can't be
 * expressed in plain Tailwind classes — drawer-vs-sidebar, virtualized row
 * height, command-palette trigger surface, etc.
 *
 * Prefer Tailwind responsive classes (`md:flex-row`, `lg:grid-cols-3`) for
 * styling. This hook is for behaviour, not visuals.
 */
export function useBreakpoint(): Breakpoint | null {
  const [current, setCurrent] = useState<Breakpoint | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const compute = (): Breakpoint | null => {
      const width = window.innerWidth;
      let match: Breakpoint | null = null;
      for (const key of BREAKPOINT_ORDER) {
        if (width >= BREAKPOINTS[key]) match = key;
      }
      return match;
    };

    setCurrent(compute());

    const handleResize = () => setCurrent(compute());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return current;
}

/**
 * `true` when the viewport is below the `md` breakpoint. Server-renders as
 * `false` to match desktop-first hydration; flip to `true` after mount on
 * mobile viewports.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
