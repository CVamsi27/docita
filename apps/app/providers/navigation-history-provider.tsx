"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavigationStore } from "@/lib/stores/navigation-store";

interface NavigationHistoryProviderProps {
  children: React.ReactNode;
}

export function NavigationHistoryProvider({
  children,
}: NavigationHistoryProviderProps) {
  const pathname = usePathname();
  const pushRoute = useNavigationStore((state) => state.pushRoute);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (pathname) {
      pushRoute(pathname);

      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
  }, [pathname, pushRoute]);

  return <>{children}</>;
}
