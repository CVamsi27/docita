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

  // Shared by every callback below — each builds the same access-context
  // shape from the same hook state (tier, intelligence add-on, user, clinic),
  // differing only in a handful of per-call overrides (the resolved user id,
  // whether the intelligence add-on counts, and an optional required
  // permission). Centralizing it keeps the five evaluators from drifting
  // apart on what "the current access context" means.
  const buildContext = useCallback(
    (
      feature: Feature | string,
      overrides?: {
        userId?: string;
        hasIntelligence?: boolean;
        requiredPermission?: Permission;
      },
    ) =>
      buildFeatureAccessContext({
        feature,
        userId: overrides?.userId ?? (user?.id || "current-user"),
        currentTier,
        hasIntelligence: overrides?.hasIntelligence ?? hasIntelligence,
        userRole: resolveUserRoleForAccess(user?.role),
        clinicType: clinic?.type,
        requiredPermission: overrides?.requiredPermission,
      }),
    [currentTier, hasIntelligence, user, clinic],
  );

  const canAccess = useCallback(
    (feature: Feature | string, requiredPermission?: Permission): boolean => {
      const context = buildContext(feature, { requiredPermission });
      return accessService.canAccessSync(context).granted;
    },
    [accessService, buildContext],
  );

  const canAccessAsync = useCallback(
    async (feature: Feature | string): Promise<boolean> => {
      const context = buildContext(feature, { hasIntelligence: false });
      const decision = await accessService.canAccess(context);
      return decision.granted;
    },
    [accessService, buildContext],
  );

  const getReason = useCallback(
    (feature: Feature | string): string => {
      const context = buildContext(feature, { userId: "current-user" });
      return accessService.getReason(context);
    },
    [accessService, buildContext],
  );

  const getUpgradeOptions = useCallback(
    (feature: Feature | string): IUpgradeOption[] => {
      const context = buildContext(feature);
      return accessService.getUpgradeOptions(context);
    },
    [accessService, buildContext],
  );

  const getDecision = useCallback(
    (feature: Feature | string): IAccessDecision => {
      const context = buildContext(feature);
      return accessService.canAccessSync(context);
    },
    [accessService, buildContext],
  );

  return {
    canAccess,
    canAccessAsync,
    getReason,
    getUpgradeOptions,
    getDecision,
  };
}
