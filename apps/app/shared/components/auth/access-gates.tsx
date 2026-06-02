"use client";

import React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useTierAccess } from "@/hooks/use-tier-access";
import { useRouter } from "next/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { Feature, Tier } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";

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
              : requiredTier != null
                ? getTierDisplayName(requiredTier)
                : getRequiredTier(Feature.BASIC_PATIENT_MANAGEMENT)
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
    <div role="alert" className="surface-warning rounded-lg p-6 text-center">
      <div className="icon-warning mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <svg
          className="h-6 w-6"
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
      <h3 className="text-lg font-semibold">Upgrade Required</h3>
      <p className="mt-1 text-sm opacity-90">
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
      <Button
        onClick={() => router.push(SUBSCRIPTION_SETTINGS_PATH)}
        variant="secondary"
        className="mt-4"
      >
        View Plans & Upgrade
      </Button>
    </div>
  );
}

function SubscriptionExpiredBanner() {
  const router = useRouter();

  return (
    <div role="alert" className="surface-danger rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold">Subscription Inactive</h3>
      <p className="mt-1 text-sm opacity-90">
        Your subscription has expired. Please renew to continue using Docita.
      </p>
      <Button
        onClick={() => router.push(SUBSCRIPTION_BILLING_RESOLVE_PATH)}
        variant="destructive"
        className="mt-4"
      >
        Renew Subscription
      </Button>
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
    viewPatients: permissions.canViewPatients,
    createPatient: permissions.canCreatePatient,
    editPatient: permissions.canEditPatient,
    deletePatient: permissions.canDeletePatient,
    viewAppointments: permissions.canViewAppointments,
    createAppointment: permissions.canCreateAppointment,
    viewInvoices: permissions.canViewInvoices,
    createInvoice: permissions.canCreateInvoice,
    viewPrescriptions: permissions.canViewPrescriptions,
    manageTemplates: permissions.canManageTemplates,
    viewPlatformAnalytics: permissions.canViewPlatformAnalytics,
    viewSystemLogs: permissions.canViewSystemLogs,
    manageTenants: permissions.canManageTenants,
  };

  return permissionMap[permission] ?? false;
}

function getTierDisplayName(tier: Tier): string {
  const names: Record<Tier, string> = {
    [Tier.STARTER]: "Starter",
    [Tier.ESSENTIAL]: "Essential",
    [Tier.FRONT_DESK]: "Front desk",
    [Tier.FRONT_DESK_CLINIC]: "Front desk Clinic",
    [Tier.FRONT_DESK_HOSPITAL]: "Front desk Hospital",
    [Tier.PROFESSIONAL]: "Professional",
    [Tier.HOSPITAL]: "Hospital",
    [Tier.ENTERPRISE]: "Enterprise",
    [Tier.INTELLIGENCE]: "Intelligence",
  };
  return names[tier] || "Unknown";
}

function formatFeatureName(feature: Feature): string {
  return humanizeUiLabel(feature);
}
