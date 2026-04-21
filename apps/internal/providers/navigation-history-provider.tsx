"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const NAV_COUNT_KEY = "docita-internal:nav-count";
const NAV_ENTRY_KEY = "docita-internal:nav-entry";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readInAppNavCount(): number {
  const storage = getSessionStorage();
  if (!storage) return 0;
  const raw = storage.getItem(NAV_COUNT_KEY);
  const value = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(value) ? value : 0;
}

interface NavigationHistoryProviderProps {
  children: React.ReactNode;
}

export function NavigationHistoryProvider({
  children,
}: NavigationHistoryProviderProps) {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const storage = getSessionStorage();
    if (!storage || !pathname) return;

    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const current = readInAppNavCount();
    if (current === 0) {
      storage.setItem(NAV_ENTRY_KEY, pathname);
    }
    storage.setItem(NAV_COUNT_KEY, String(current + 1));
  }, [pathname]);

  return <>{children}</>;
}
