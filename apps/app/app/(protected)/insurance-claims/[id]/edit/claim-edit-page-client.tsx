"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InsuranceClaimEditUI } from "@/features/insurance-claims/components";

export function InsuranceClaimEditPageClient() {
  const params = useParams<{ id: string }>();
  return (
    <FeatureGate feature={Feature.INSURANCE_BILLING} showLockedCard>
      <InsuranceClaimEditUI id={params.id ?? ""} />
    </FeatureGate>
  );
}
