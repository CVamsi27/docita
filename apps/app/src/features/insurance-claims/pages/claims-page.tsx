import type { ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InsuranceClaimsPageUI } from "@/features/insurance-claims/components/list/InsuranceClaimsPageUI";
import { InsuranceClaimCreateUI } from "@/features/insurance-claims/components/forms/InsuranceClaimCreateUI";
import { InsuranceClaimEditUI } from "@/features/insurance-claims/components/forms/InsuranceClaimEditUI";
import { InsuranceClaimDetailsUI } from "@/features/insurance-claims/components/details/InsuranceClaimDetailsUI";

function WithClaimsGate({ children }: { children: ReactNode }) {
  return (
    <FeatureGate feature={Feature.INSURANCE_BILLING} showLockedCard>
      {children}
    </FeatureGate>
  );
}

export function ClaimsListPage() {
  return (
    <>
      <PageMeta
        title="Insurance Claims"
        description="Submit and track insurance claims"
      />
      <WithClaimsGate>
        <InsuranceClaimsPageUI />
      </WithClaimsGate>
    </>
  );
}

export function ClaimNewPage() {
  const [searchParams] = useSearchParams();
  const presets = {
    patientId: searchParams.get("patientId") ?? undefined,
    invoiceId: searchParams.get("invoiceId") ?? undefined,
    claimType: (searchParams.get("claimType") as
      | "PRE_AUTH"
      | "REIMBURSEMENT"
      | undefined) ?? undefined,
  };
  return (
    <>
      <PageMeta title="New Insurance Claim" description="Create a new claim" />
      <WithClaimsGate>
        <InsuranceClaimCreateUI presets={presets} />
      </WithClaimsGate>
    </>
  );
}

export function ClaimDetailPage() {
  const { id } = useParams();
  return (
    <>
      <PageMeta title="Insurance Claim" description="Claim details" />
      <WithClaimsGate>
        <InsuranceClaimDetailsUI id={id ?? ""} />
      </WithClaimsGate>
    </>
  );
}

export function ClaimEditPage() {
  const { id } = useParams();
  return (
    <>
      <PageMeta title="Edit Insurance Claim" description="Edit claim details" />
      <WithClaimsGate>
        <InsuranceClaimEditUI id={id ?? ""} />
      </WithClaimsGate>
    </>
  );
}
