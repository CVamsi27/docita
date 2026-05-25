"use client";

import { Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";

/** Align React Query `enabled` with API {@link TierGuard} feature checks. */
export function useTierFeatureEnabled(feature: Feature): boolean {
  return usePermissionStore((s) => s.canAccess(feature));
}
