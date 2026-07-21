"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { readInAppNavCount } from "@/providers/navigation-history-provider";

export function useBackNavigation(fallback: string) {
  const router = useRouter();

  return useCallback(() => {
    if (readInAppNavCount() > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }, [router, fallback]);
}
