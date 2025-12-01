"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavigationStore } from "@/lib/stores/navigation-store";

interface NavigationHistoryProviderProps {
  children: React.ReactNode;
}

/**
 * NavigationHistoryProvider
 *
 * Automatically tracks route changes and pushes them to the navigation store.
 * This enables smart back navigation throughout the app.
 *
 * Wrap your layout with this provider to enable automatic history tracking.
 */
export function NavigationHistoryProvider({
  children,
}: NavigationHistoryProviderProps) {
  const pathname = usePathname();
  const pushRoute = useNavigationStore((state) => state.pushRoute);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (pathname) {
      // Push the current route to history
      // The store handles duplicate prevention internally
      pushRoute(pathname);

      // After initial mount, we're tracking normally
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
  }, [pathname, pushRoute]);

  return <>{children}</>;
}
