import type { CreateInsuranceClaimFormValues } from "@workspace/types";
import type { UseFormSetValue } from "react-hook-form";

type ClaimCreateSetValue = UseFormSetValue<CreateInsuranceClaimFormValues>;
type PatientInsuranceDefaults = {
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceGroupNumber?: string | null;
};
type InvoiceAmountDefaults = {
  grandTotal?: number | null;
  total?: number | null;
};

export function applyPatientInsuranceDefaults(
  form: { setValue: ClaimCreateSetValue },
  patient: PatientInsuranceDefaults | null | undefined,
): void {
  if (!patient) return;
  setFormValueWhenPresent(form, "insurerName", patient.insuranceProvider);
  setFormValueWhenPresent(form, "policyNumber", patient.insurancePolicyNumber);
  setFormValueWhenPresent(form, "groupNumber", patient.insuranceGroupNumber);
}

export function applyInvoiceClaimAmountDefault(
  form: { setValue: ClaimCreateSetValue },
  invoice: InvoiceAmountDefaults | null | undefined,
): void {
  const amount = invoice?.grandTotal ?? invoice?.total;
  if (typeof amount === "number" && amount >= 0) {
    form.setValue("claimedAmount", amount);
  }
}

function setFormValueWhenPresent(
  form: { setValue: ClaimCreateSetValue },
  field: "insurerName" | "policyNumber" | "groupNumber",
  value: string | null | undefined,
): void {
  if (value) form.setValue(field, value);
}
