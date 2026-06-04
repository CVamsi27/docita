import type {
  CreateInsuranceClaimFormValues,
  CreateInsuranceClaimInput,
} from "@workspace/types";

export function buildCreateClaimPayload(
  data: CreateInsuranceClaimFormValues,
): CreateInsuranceClaimInput {
  const payload = buildRequiredClaimPayload(data);
  if (data.invoiceId) payload.invoiceId = data.invoiceId;
  if (data.appointmentId) payload.appointmentId = data.appointmentId;
  if (data.tpaName) payload.tpaName = data.tpaName;
  if (data.groupNumber) payload.groupNumber = data.groupNumber;
  if (data.notes) payload.notes = data.notes;
  return payload;
}

function buildRequiredClaimPayload(
  data: CreateInsuranceClaimFormValues,
): CreateInsuranceClaimInput {
  return {
    patientId: data.patientId,
    claimType: data.claimType,
    insurerName: data.insurerName,
    policyNumber: data.policyNumber,
    claimedAmountCents: Math.round((data.claimedAmount || 0) * 100),
  };
}
