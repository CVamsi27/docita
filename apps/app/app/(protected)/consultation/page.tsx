"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { ConsultationDashboardUI } from "@/features/consultation/components/ConsultationDashboardUI";

export default function ConsultationPage() {
  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
      <ConsultationDashboardUI />
    </FeatureGate>
  );
}
