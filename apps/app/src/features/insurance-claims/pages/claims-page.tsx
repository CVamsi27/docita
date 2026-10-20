import type { ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { InsuranceClaimsPageUI } from "@/features/insurance-claims/components/list/InsuranceClaimsPageUI";
import { InsuranceClaimCreateUI } from "@/features/insurance-claims/components/forms/InsuranceClaimCreateUI";
import { InsuranceClaimEditUI } from "@/features/insurance-claims/components/forms/InsuranceClaimEditUI";
import { InsuranceClaimDetailsUI } from "@/features/insurance-claims/components/details/InsuranceClaimDetailsUI";

function WithClaimsGate({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <>
      <PageMeta title={title} description={description} />
      <PageFeatureGate
        feature={Feature.INSURANCE_BILLING}
        title={title}
        description={description}
      >
        {children}
      </PageFeatureGate>
    </>
  );
}

export function ClaimsListPage() {
  return (
    <WithClaimsGate
      title="Insurance Claims"
      description="Submit and track insurance claims"
    >
      <InsuranceClaimsPageUI />
    </WithClaimsGate>
  );
}

export function ClaimNewPage() {
  const [searchParams] = useSearchParams();
  const presets = {
    patientId: searchParams.get("patientId") ?? undefined,
    invoiceId: searchParams.get("invoiceId") ?? undefined,
    claimType:
      (searchParams.get("claimType") as
        | "PRE_AUTH"
        | "REIMBURSEMENT"
        | undefined) ?? undefined,
  };
  return (
    <WithClaimsGate
      title="New Insurance Claim"
      description="Create a new claim"
    >
      <InsuranceClaimCreateUI presets={presets} />
    </WithClaimsGate>
  );
}

export function ClaimDetailPage() {
  const { id } = useParams();
  return (
    <WithClaimsGate title="Insurance Claim" description="Claim details">
      <InsuranceClaimDetailsUI id={id ?? ""} />
    </WithClaimsGate>
  );
}

export function ClaimEditPage() {
  const { id } = useParams();
  return (
    <WithClaimsGate
      title="Edit Insurance Claim"
      description="Edit claim details"
    >
      <InsuranceClaimEditUI id={id ?? ""} />
    </WithClaimsGate>
  );
}
