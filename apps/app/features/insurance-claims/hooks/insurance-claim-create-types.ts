import type { CreateInsuranceClaimFormValues } from "@workspace/types";

export interface ClaimCreatePresets {
  patientId?: string;
  invoiceId?: string;
  claimType?: CreateInsuranceClaimFormValues["claimType"];
}
