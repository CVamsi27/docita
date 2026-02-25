"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { LabTestsPageUI } from "@/features/lab-tests/components/LabTestsPageUI";

export default function LabTestsPage() {
  return (
    <FeatureGate feature={Feature.LAB_TESTS} showLockedCard>
      <LabTestsPageUI />
    </FeatureGate>
  );
}
