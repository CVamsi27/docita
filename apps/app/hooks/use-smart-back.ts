"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/lib/stores/navigation-store";

export function useSmartBack(fallback: string = "/") {
  const router = useRouter();
  const { canGoBack, popRoute, getPreviousRoute } = useNavigationStore();

  const goBack = useCallback(() => {
    if (canGoBack()) {
      const previousRoute = getPreviousRoute(fallback);
      popRoute();
      router.push(previousRoute);
    } else {
      router.push(fallback);
    }
  }, [canGoBack, popRoute, getPreviousRoute, router, fallback]);

  return goBack;
}
