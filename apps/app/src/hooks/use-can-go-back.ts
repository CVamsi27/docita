import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === null || event.key === "docita:nav-count") callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function readInAppNavCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem("docita:nav-count")) || 0;
  } catch { return 0; }
}

export function useCanGoBack(): boolean {
  const count = useSyncExternalStore(subscribe, () => readInAppNavCount(), () => 0);
  return count > 1;
}
