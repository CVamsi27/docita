"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { ConsultationDashboardUI } from "@/features/consultation/components/ConsultationDashboardUI";

export default function ConsultationPage() {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
        <ConsultationDashboardUI />
      </FeatureGate>
    </div>
  );
}
