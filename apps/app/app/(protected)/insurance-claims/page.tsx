"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InsuranceClaimsPageUI } from "@/features/insurance-claims/components";

export default function InsuranceClaimsListPage() {
  return (
    <FeatureGate feature={Feature.INSURANCE_BILLING} showLockedCard>
      <InsuranceClaimsPageUI />
    </FeatureGate>
  );
}
