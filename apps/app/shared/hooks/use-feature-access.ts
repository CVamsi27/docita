"use client";

/**
 * Access-control helper layered on {@link AccessControlService} (tier + addon rules).
 * For route, navigation, and settings visibility, prefer {@link usePermissionStore}
 * together with {@link canAccessTarget} so UI matches `APP_ACCESS_MATRIX` and
 * clinic tier data from `/clinic/settings`. Use this hook only where upgrade-path
 * messaging or add-on-specific evaluation is still required.
 */
import { useCallback, useMemo } from "react";
import { type Feature } from "@workspace/types";

import { AccessControlFactory } from "@/lib/access-control/factory";
import {
  type IAccessDecision,
  type IUpgradeOption,
} from "@/lib/access-control/interfaces";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import type { Permission } from "@/lib/auth/permissions";
import {
  buildFeatureAccessContext,
  resolveUserRoleForAccess,
} from "@/shared/hooks/use-feature-access-helpers";

export function useFeatureAccess() {
  const { currentTier, hasIntelligence } = usePermissionStore();

  const { user } = useAuth();

  const { clinic } = useClinic();

  const accessService = useMemo(
    () =>
      AccessControlFactory.create({
        enableLogging: process.env.NODE_ENV === "development",
        enableAnalytics: process.env.NODE_ENV === "production",
      }),
    [],
  );

  const canAccess = useCallback(
    (feature: Feature | string, requiredPermission?: Permission): boolean => {
      const context = buildFeatureAccessContext({
        feature,
        userId: user?.id || "current-user",
        currentTier,
        hasIntelligence,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
        requiredPermission,
      });

      return accessService.canAccessSync(context).granted;
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  const canAccessAsync = useCallback(
    async (feature: Feature | string): Promise<boolean> => {
      const context = buildFeatureAccessContext({
        feature,
        userId: user?.id || "current-user",
        currentTier,
        hasIntelligence: false,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
      });

      const decision = await accessService.canAccess(context);
      return decision.granted;
    },
    [currentTier, accessService, user, clinic],
  );

  const getReason = useCallback(
    (feature: Feature | string): string => {
      const context = buildFeatureAccessContext({
        feature,
        userId: "current-user",
        currentTier,
        hasIntelligence,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
      });

      return accessService.getReason(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  const getUpgradeOptions = useCallback(
    (feature: Feature | string): IUpgradeOption[] => {
      const context = buildFeatureAccessContext({
        feature,
        userId: user?.id || "current-user",
        currentTier,
        hasIntelligence,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
      });

      return accessService.getUpgradeOptions(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  const getDecision = useCallback(
    (feature: Feature | string): IAccessDecision => {
      const context = buildFeatureAccessContext({
        feature,
        userId: user?.id || "current-user",
        currentTier,
        hasIntelligence,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
      });

      return accessService.canAccessSync(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  return {
    canAccess,
    canAccessAsync,
    getReason,
    getUpgradeOptions,
    getDecision,
  };
}
