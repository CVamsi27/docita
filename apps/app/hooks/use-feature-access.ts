/**
 * React Hook for Feature Access Control
 * Clean interface for accessing the SOLID-based access control system
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { Feature, type ClinicType } from "@workspace/types";

import { AccessControlFactory } from "../lib/access-control/factory";
import type {
  IAccessContext,
  IAccessDecision,
  IUpgradeOption,
} from "../lib/access-control/interfaces";
import { AddOnType } from "../lib/access-control/interfaces";
import { usePermissionStore } from "../lib/stores/permission-store";
import { useAuth } from "../lib/auth-context";
import { useClinic } from "../lib/clinic-context"; // NEW
import type { Permission } from "../lib/permissions";

/**
 * Hook for feature access control
 * Provides a clean, React-friendly interface to the access control system
 */
export function useFeatureAccess() {
  // Get subscription data from permission store (temporary during migration)
  const { currentTier, hasIntelligence } = usePermissionStore();

  // Get user role from auth context
  const { user } = useAuth();

  // Get clinic type from clinic context
  const { clinic } = useClinic(); // NEW

  // Create access control service instance (memoized)
  const accessService = useMemo(
    () =>
      AccessControlFactory.create({
        enableLogging: process.env.NODE_ENV === "development",
        enableAnalytics: process.env.NODE_ENV === "production",
      }),
    [],
  );

  /**
   * Check if user can access a feature (synchronous)
   * @param feature - The feature to check
   * @param requiredPermission - Optional permission required for this feature
   */
  const canAccess = useCallback(
    (feature: Feature | string, requiredPermission?: Permission): boolean => {
      // Build access context
      const context: IAccessContext = {
        feature,
        userId: user?.id || "current-user",
        subscription: {
          tier: currentTier,
          // NOTE: Subscription status is not yet available in store. Defaulting to active.
          status: "active",
          features: [],
          startDate: new Date(),
          billingCycle: "monthly",
        },
        addOns: [
          // NOTE: Detailed add-ons not yet in store. Inferring from flags.
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
        clinicType: (clinic?.type as ClinicType) || undefined, // NEW: Include clinic type
      };

      return accessService.canAccessSync(context).granted;
    },
    [currentTier, hasIntelligence, accessService, user, clinic], // Added clinic
  );

  /**
   * Check if user can access a feature (async with fresh data)
   */
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
        clinicType: (clinic?.type as ClinicType) || undefined, // NEW
      };

      const decision = await accessService.canAccess(context);
      return decision.granted;
    },
    [currentTier, accessService, user, clinic], // Added clinic
  );

  /**
   * Get denial reason for a feature
   */
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
        clinicType: (clinic?.type as ClinicType) || undefined, // NEW
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
    [currentTier, hasIntelligence, accessService, user, clinic], // Added clinic
  );

  /**
   * Get full access decision (useful for debugging)
   */
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
        clinicType: (clinic?.type as ClinicType) || undefined, // NEW
      };

      return accessService.canAccessSync(context);
    },
    [currentTier, hasIntelligence, accessService, user, clinic], // Added clinic
  );

  return {
    canAccess,
    canAccessAsync,
    getReason,
    getUpgradeOptions,
    getDecision,
  };
}
