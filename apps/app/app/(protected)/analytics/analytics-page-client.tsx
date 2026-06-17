"use client";

import dynamic from "next/dynamic";
import { Feature } from "@workspace/types";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useAnalyticsLogic } from "@/features/analytics/hooks/use-analytics-logic";

function AnalyticsRouteLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-label="Loading analytics"
    >
      <DocitaLoadingIndicator variant="page" withStatusRole={false} />
    </div>
  );
}

const AnalyticsPageUI = dynamic(
  () =>
    import("@/features/analytics/components/AnalyticsPageUI").then(
      (m) => m.AnalyticsPageUI,
    ),
  { ssr: false, loading: () => <AnalyticsRouteLoading /> },
);

export function AnalyticsPageClient() {
  const { state, handlers } = useAnalyticsLogic();

  return (
    <FeatureGate feature={Feature.BASIC_ANALYTICS} showLockedCard>
      <AnalyticsPageUI
        overview={state.overview}
        diseaseTrends={state.diseaseTrends}
        revenueByCPT={state.revenueByCPT}
        complianceMetrics={state.complianceMetrics}
        isLoading={state.isLoading}
        isError={state.isError}
        onRetry={handlers.refetch}
        trendsLoading={state.trendsLoading}
        revenueLoading={state.revenueLoading}
        complianceLoading={state.complianceLoading}
        activeTab={state.activeTab}
        onTabChange={handlers.setActiveTab}
      />
    </FeatureGate>
  );
}
