"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/lib/stores/navigation-store";

/**
 * useSmartBack
 *
 * A hook that provides intelligent back navigation.
 * Instead of relying on browser history (which can be unpredictable),
 * it uses the app's tracked navigation history.
 *
 * @param fallback - The route to navigate to if there's no history (default: "/")
 * @returns goBack function that navigates to the previous route or fallback
 *
 * @example
 * ```tsx
 * const goBack = useSmartBack("/dashboard");
 *
 * return <button onClick={goBack}>Back</button>;
 * ```
 */
export function useSmartBack(fallback: string = "/") {
  const router = useRouter();
  const { canGoBack, popRoute, getPreviousRoute } = useNavigationStore();

  const goBack = useCallback(() => {
    if (canGoBack()) {
      // Pop current page from history
      popRoute();
      // Get the previous route (which is now the last item after popping)
      const previousRoute = getPreviousRoute(fallback);
      router.push(previousRoute);
    } else {
      // No history available, go to fallback
      router.push(fallback);
    }
  }, [canGoBack, popRoute, getPreviousRoute, router, fallback]);

  return goBack;
}
