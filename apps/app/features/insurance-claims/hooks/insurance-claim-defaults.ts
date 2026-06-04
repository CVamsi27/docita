import type { CreateInsuranceClaimFormValues } from "@workspace/types";
import type { ClaimCreatePresets } from "./insurance-claim-create-types";
import { resolveDefaultClaimType } from "./insurance-claim-default-type";

export function buildClaimCreateDefaultValues(
  presets?: ClaimCreatePresets,
): CreateInsuranceClaimFormValues {
  return {
    patientId: presets?.patientId ?? "",
    claimType: resolveDefaultClaimType(presets),
    invoiceId: presets?.invoiceId ?? "",
    appointmentId: "",
    insurerName: "",
    tpaName: "",
    policyNumber: "",
    groupNumber: "",
    claimedAmount: 0,
    notes: "",
  };
}
