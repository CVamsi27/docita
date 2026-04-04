"use client";

import dynamic from "next/dynamic";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { useAnalyticsLogic } from "@/features/analytics/hooks/use-analytics-logic";

// ssr: false keeps recharts (~382KB) out of the server bundle entirely —
// chart data is always fetched client-side so there's no SSR value here.
const AnalyticsPageUI = dynamic(
  () =>
    import("@/features/analytics/components/AnalyticsPageUI").then(
      (m) => m.AnalyticsPageUI,
    ),
  { ssr: false },
);

export default function AnalyticsPage() {
  const { state, handlers } = useAnalyticsLogic();

  return (
    <FeatureGate feature={Feature.BASIC_ANALYTICS} showLockedCard>
      <AnalyticsPageUI
        overview={state.overview}
        diseaseTrends={state.diseaseTrends}
        revenueByCPT={state.revenueByCPT}
        complianceMetrics={state.complianceMetrics}
        isLoading={state.isLoading}
        trendsLoading={state.trendsLoading}
        revenueLoading={state.revenueLoading}
        complianceLoading={state.complianceLoading}
        activeTab={state.activeTab}
        onTabChange={handlers.setActiveTab}
      />
    </FeatureGate>
  );
}
