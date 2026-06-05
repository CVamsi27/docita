import type { CreateInsuranceClaimFormValues } from "@workspace/types";
import type { ClaimCreatePresets } from "./insurance-claim-create-types";

export function resolveDefaultClaimType(
  presets?: ClaimCreatePresets,
): CreateInsuranceClaimFormValues["claimType"] {
  return (
    presets?.claimType ?? (presets?.invoiceId ? "REIMBURSEMENT" : "PRE_AUTH")
  );
}
