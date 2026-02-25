"use client";

import React from "react";
import { usePermissions } from "../../hooks/use-permissions";
import { useTierAccess } from "../../hooks/use-tier-access";
import { useRouter } from "next/navigation";
import type { Permission } from "../../lib/permissions";
import { Feature, Tier } from "@workspace/types";

interface PermissionGateProps {
  requires: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  requires,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const permissions = usePermissions();
  const permissionList = Array.isArray(requires) ? requires : [requires];

  const hasAccess = requireAll
    ? permissionList.every((p) => checkPermission(permissions, p))
    : permissionList.some((p) => checkPermission(permissions, p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface TierGateProps {
  requiredTier?: Tier;
  feature?: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function TierGate({
  requiredTier,
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: TierGateProps) {
  const { hasTier, hasFeature, getRequiredTier, currentTierName } =
    useTierAccess();

  let hasAccess = true;

  if (requiredTier !== undefined) {
    hasAccess = hasTier(requiredTier);
  } else if (feature !== undefined) {
    hasAccess = hasFeature(feature);
  }

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    if (showUpgradePrompt) {
      return (
        <UpgradePrompt
          requiredTier={
            feature
              ? getRequiredTier(feature)
              : getTierDisplayName(requiredTier!)
          }
          currentTier={currentTierName}
          featureName={feature}
        />
      );
    }
    return null;
  }

  return <>{children}</>;
}

interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SubscriptionGate({
  children,
  fallback,
}: SubscriptionGateProps) {
  const { isSubscriptionActive } = useTierAccess();

  if (!isSubscriptionActive) {
    return <>{fallback ?? <SubscriptionExpiredBanner />}</>;
  }

  return <>{children}</>;
}

function UpgradePrompt({
  requiredTier,
  currentTier,
  featureName,
}: {
  requiredTier: string;
  currentTier: string;
  featureName?: Feature;
}) {
  const router = useRouter();

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
        <svg
          className="h-6 w-6 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
        Upgrade Required
      </h3>
      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
        {featureName
          ? `The ${formatFeatureName(featureName)} feature requires `
          : "This feature requires "}
        <strong>Docita {requiredTier}</strong> tier or higher.
        {currentTier && (
          <>
            {" "}
            You are currently on <strong>Docita {currentTier}</strong>.
          </>
        )}
      </p>
      <button
        onClick={() => router.push("/settings/billing")}
        className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
      >
        View Plans & Upgrade
      </button>
    </div>
  );
}

function SubscriptionExpiredBanner() {
  const router = useRouter();

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
    >
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
        Subscription Inactive
      </h3>
      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
        Your subscription has expired. Please renew to continue using Docita.
      </p>
      <button
        onClick={() => router.push("/settings/billing")}
        className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
      >
        Renew Subscription
      </button>
    </div>
  );
}

function checkPermission(
  permissions: ReturnType<typeof usePermissions>,
  permission: Permission,
): boolean {
  const permissionMap: Record<string, boolean> = {
    manageStaff: permissions.canManageStaff,
    manageClinic: permissions.canManageClinic,
    startConsultation: permissions.canStartConsultation,
    manageBilling: permissions.canManageBilling,
    viewReports: permissions.canViewReports,
    manageInventory: permissions.canManageInventory,
    exportData: permissions.canExportData,
    createPrescription: permissions.canCreatePrescription,
  };

  return permissionMap[permission] ?? false;
}

function getTierDisplayName(tier: Tier): string {
  const names: Record<Tier, string> = {
    [Tier.CAPTURE]: "Capture",
    [Tier.CORE]: "Core",
    [Tier.PLUS]: "Plus",
    [Tier.PRO]: "Pro",
    [Tier.ENTERPRISE]: "Enterprise",
    [Tier.INTELLIGENCE]: "Intelligence",
  };
  return names[tier] || "Unknown";
}

function formatFeatureName(feature: Feature): string {
  return feature
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
