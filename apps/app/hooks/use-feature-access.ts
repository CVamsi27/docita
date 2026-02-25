"use client";

import { useCallback, useMemo } from "react";
import { type ClinicType, Feature } from "@workspace/types";

import { AccessControlFactory } from "../lib/access-control/factory";
import {
  AddOnType,
  type IAccessContext,
  type IAccessDecision,
  type IUpgradeOption,
} from "../lib/access-control/interfaces";
import { usePermissionStore } from "../lib/stores/permission-store";
import { useAuth } from "../lib/auth-context";
import { useClinic } from "../lib/clinic-context";
import type { Permission } from "../lib/permissions";

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
      const context: IAccessContext = {
        feature,
        userId: user?.id || "current-user",
        subscription: {
          tier: currentTier,
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: [
          ...(hasIntelligence
            ? [
                {
                  type: AddOnType.INTELLIGENCE,
                  status: "active" as const,
                  baseQuota: 500,
                  usedQuota: 0,
                  overageRate: 3,
                  billingCycle: "monthly" as const,
                },
              ]
            : []),
        ],
        overrides: [],
        userRole: user?.role || "RECEPTIONIST",
        requiredPermission,
        clinicType: (clinic?.type as ClinicType) || undefined,
      };

      return accessService.canAccessSync(context).granted;
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  const canAccessAsync = useCallback(
    async (feature: Feature | string): Promise<boolean> => {
      const context: IAccessContext = {
        feature,
        userId: user?.id || "current-user",
        subscription: {
          tier: currentTier,
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: [],
        overrides: [],
        userRole: user?.role || "RECEPTIONIST",
        clinicType: (clinic?.type as ClinicType) || undefined,
      };

      const decision = await accessService.canAccess(context);
      return decision.granted;
    },
    [currentTier, accessService, user, clinic],
  );

  const getReason = useCallback(
    (feature: Feature | string): string => {
      const context: IAccessContext = {
        feature,
        userId: "current-user",
        subscription: {
          tier: currentTier,
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: hasIntelligence
          ? [
              {
                type: AddOnType.INTELLIGENCE,
                status: "active",
                baseQuota: 500,
                usedQuota: 0,
                overageRate: 3,
                billingCycle: "monthly",
              },
            ]
          : [],
        overrides: [],
        userRole: user?.role || "RECEPTIONIST",
        clinicType: (clinic?.type as ClinicType) || undefined,
      };

      return accessService.getReason(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic], // Added clinic
  );

  /**
   * Get upgrade options for a feature
   */
  const getUpgradeOptions = useCallback(
    (feature: Feature | string): IUpgradeOption[] => {
      const context: IAccessContext = {
        feature,
        userId: user?.id || "current-user",
        subscription: {
          tier: currentTier,
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: hasIntelligence
          ? [
              {
                type: AddOnType.INTELLIGENCE,
                status: "active",
                baseQuota: 500,
                usedQuota: 0,
                overageRate: 3,
                billingCycle: "monthly",
              },
            ]
          : [],
        overrides: [],
        userRole: user?.role || "RECEPTIONIST",
        clinicType: (clinic?.type as ClinicType) || undefined, // NEW
      };

      return accessService.getUpgradeOptions(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic],
  );

  const getDecision = useCallback(
    (feature: Feature | string): IAccessDecision => {
      const context: IAccessContext = {
        feature,
        userId: user?.id || "current-user",
        subscription: {
          tier: currentTier,
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: hasIntelligence
          ? [
              {
                type: AddOnType.INTELLIGENCE,
                status: "active",
                baseQuota: 500,
                usedQuota: 0,
                overageRate: 3,
                billingCycle: "monthly",
              },
            ]
          : [],
        overrides: [],
        userRole: user?.role || "RECEPTIONIST",
        clinicType: (clinic?.type as ClinicType) || undefined,
      };

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
