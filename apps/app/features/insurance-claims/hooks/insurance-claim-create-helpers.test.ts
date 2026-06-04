import { describe, expect, it, vi } from "vitest";
import {
  applyInvoiceClaimAmountDefault,
  applyPatientInsuranceDefaults,
  buildClaimCreateDefaultValues,
  buildCreateClaimPayload,
} from "./insurance-claim-create-helpers";

describe("insurance claim create helpers", () => {
  it("selects reimbursement defaults when an invoice preset exists", () => {
    expect(
      buildClaimCreateDefaultValues({ invoiceId: "invoice-1" }),
    ).toMatchObject({
      claimType: "REIMBURSEMENT",
      invoiceId: "invoice-1",
    });
  });

  it("copies patient insurance defaults into the form", () => {
    const setValue = vi.fn();

    applyPatientInsuranceDefaults(
      { setValue },
      {
        insuranceProvider: "HDFC Ergo",
        insurancePolicyNumber: "POL-1",
        insuranceGroupNumber: "GRP-1",
      },
    );

    expect(setValue).toHaveBeenCalledWith("insurerName", "HDFC Ergo");
    expect(setValue).toHaveBeenCalledWith("policyNumber", "POL-1");
    expect(setValue).toHaveBeenCalledWith("groupNumber", "GRP-1");
  });

  it("uses the invoice grand total as the default claim amount", () => {
    const setValue = vi.fn();

    applyInvoiceClaimAmountDefault(
      { setValue },
      { grandTotal: 1250, total: 1000 },
    );

    expect(setValue).toHaveBeenCalledWith("claimedAmount", 1250);
  });

  it("builds the API payload without empty optional fields", () => {
    expect(
      buildCreateClaimPayload({
        patientId: "patient-1",
        claimType: "PRE_AUTH",
        invoiceId: "",
        appointmentId: "appointment-1",
        insurerName: "Care",
        tpaName: "",
        policyNumber: "POL-1",
        groupNumber: "",
        claimedAmount: 42.5,
        notes: "",
      }),
    ).toEqual({
      patientId: "patient-1",
      claimType: "PRE_AUTH",
      appointmentId: "appointment-1",
      insurerName: "Care",
      policyNumber: "POL-1",
      claimedAmountCents: 4250,
    });
  });
});
