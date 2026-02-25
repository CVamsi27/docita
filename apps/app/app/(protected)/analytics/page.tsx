"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { useAnalyticsLogic } from "@/features/analytics/hooks/use-analytics-logic";
import { AnalyticsPageUI } from "@/features/analytics/components/AnalyticsPageUI";

export default function AnalyticsPage() {
  const { state } = useAnalyticsLogic();

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
      />
    </FeatureGate>
  );
}
