"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InsuranceClaimDetailsUI } from "@/features/insurance-claims/components";

export function InsuranceClaimDetailsPageClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  return (
    <FeatureGate feature={Feature.INSURANCE_BILLING} showLockedCard>
      <InsuranceClaimDetailsUI id={id} />
    </FeatureGate>
  );
}
