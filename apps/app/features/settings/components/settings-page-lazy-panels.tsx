"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";

export function LazySettingsPanelFallback() {
  return (
    <div
      className="space-y-4 py-4"
      role="status"
      aria-live="polite"
      aria-label="Loading settings section"
    >
      <div className="flex items-center gap-3">
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

const lazySettingsPanel = <T extends Record<string, unknown>>(
  importFn: () => Promise<T>,
  select: (mod: T) => ComponentType,
) =>
  dynamic(() => importFn().then(select), {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  });

export const SubscriptionSettingsLazy = lazySettingsPanel(
  () => import("./billing/SubscriptionSettings"),
  (mod) => mod.SubscriptionSettings,
);

/** Forces a full remount after billing-hook refactors (avoids stale Fast Refresh hook order). */
export function SubscriptionSettingsPanel() {
  return <SubscriptionSettingsLazy key="subscription-billing-workspace-v3" />;
}

export const MemberManagementSettingsLazy = lazySettingsPanel(
  () => import("./management/MemberManagementSettings"),
  (mod) => mod.MemberManagementSettings,
);

export const DoctorAvailabilitySettingsLazy = lazySettingsPanel(
  () => import("./management/DoctorAvailabilitySettings"),
  (mod) => mod.DoctorAvailabilitySettings,
);

export const DoctorTimeAwaySettingsLazy = lazySettingsPanel(
  () => import("./management/DoctorTimeAwaySettings"),
  (mod) => mod.DoctorTimeAwaySettings,
);

export const LeaveManagementSettingsLazy = lazySettingsPanel(
  () => import("./leave/LeaveManagementSettings"),
  (mod) => mod.LeaveManagementSettings,
);

export const DoctorProfileSettingsLazy = lazySettingsPanel(
  () => import("./doctor-profile/DoctorProfileSettings"),
  (mod) => mod.DoctorProfileSettings,
);

export const DangerZoneSettingsLazy = lazySettingsPanel(
  () => import("./danger-zone/DangerZoneSettings"),
  (mod) => mod.DangerZoneSettings,
);

export const EnterpriseBrandingSettingsLazy = lazySettingsPanel(
  () => import("./branding/EnterpriseBrandingSettings"),
  (mod) => mod.EnterpriseBrandingSettings,
);

export const AbdmSettingsPanelLazy = lazySettingsPanel(
  () => import("./abdm/AbdmSettingsPanel"),
  (mod) => mod.AbdmSettingsPanel,
);
