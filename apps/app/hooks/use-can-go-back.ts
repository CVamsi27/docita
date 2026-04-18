"use client";

import { useSyncExternalStore } from "react";
import { readInAppNavCount } from "@/providers/navigation-history-provider";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === null || event.key === "docita:nav-count") {
      callback();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function useCanGoBack(): boolean {
  const count = useSyncExternalStore(
    subscribe,
    () => readInAppNavCount(),
    () => 0,
  );
  return count > 1;
}
