"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { getAccessTargetForPath } from "@/lib/access-control/access-routes";
import { usePermissionStore } from "@/lib/stores/permission-store";

export function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const { canAccess, currentTier, hasIntelligence, workspaceProfile } =
    usePermissionStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.role || !clinic || !pathname) return;

    const target = getAccessTargetForPath(pathname);
    if (!target) {
      router.replace("/today");
      return;
    }

    if (
      target === APP_ACCESS_TARGETS.PAGE_UPGRADE &&
      clinic.subscriptionStatus === "EXPIRED"
    ) {
      return;
    }

    const hasAccess = canAccessTarget(
      target,
      {
        role: user.role,
        canAccessFeature: canAccess,
        currentTier,
        hasIntelligence,
        workspaceProfile,
      },
      "read",
    );

    if (!hasAccess) {
      router.replace("/today");
    }
  }, [
    canAccess,
    currentTier,
    hasIntelligence,
    clinic,
    pathname,
    router,
    user?.role,
    workspaceProfile,
  ]);

  return <>{children}</>;
}
