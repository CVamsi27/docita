"use client";

import { useSearchParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InsuranceClaimCreateUI } from "@/features/insurance-claims/components";

export default function CreateInsuranceClaimPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const invoiceId = searchParams.get("invoiceId") ?? undefined;
  const claimTypeParam = searchParams.get("claimType");
  const claimType =
    claimTypeParam === "PRE_AUTH" || claimTypeParam === "REIMBURSEMENT"
      ? claimTypeParam
      : undefined;

  return (
    <FeatureGate feature={Feature.INSURANCE_BILLING} showLockedCard>
      <InsuranceClaimCreateUI
        presets={{ patientId, invoiceId, claimType }}
      />
    </FeatureGate>
  );
}
