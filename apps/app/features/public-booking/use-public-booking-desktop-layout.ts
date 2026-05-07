"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `md` — tablets use the same layout as desktop (form + sticky rail). */
const WIDE_BOOKING_LAYOUT_MEDIA_QUERY = "(min-width: 768px)";

function subscribeDesktopLayout(onStoreChange: () => void) {
  const mq = window.matchMedia(WIDE_BOOKING_LAYOUT_MEDIA_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getDesktopLayoutSnapshot() {
  return window.matchMedia(WIDE_BOOKING_LAYOUT_MEDIA_QUERY).matches;
}

/** SSR / first paint: mobile-first (`false`) until the client reads `matchMedia`. */
function getDesktopLayoutServerSnapshot() {
  return false;
}

export function usePublicBookingIsDesktopLayout(): boolean {
  return useSyncExternalStore(
    subscribeDesktopLayout,
    getDesktopLayoutSnapshot,
    getDesktopLayoutServerSnapshot,
  );
}
