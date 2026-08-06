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
      { grandTotal: 1250 },
    );

    expect(setValue).toHaveBeenCalledWith("claimedAmount", 1250);
  });

  it("builds a create payload with major-unit amounts converted to cents", () => {
    const payload = buildCreateClaimPayload({
      patientId: "patient-1",
      claimType: "REIMBURSEMENT",
      invoiceId: "invoice-1",
      appointmentId: "",
      insurerName: "Star Health",
      tpaName: "",
      policyNumber: "POL-1",
      groupNumber: "GRP-1",
      claimedAmount: 1500.5,
      notes: "",
    });

    expect(payload.claimedAmountCents).toBe(150050);
    expect(payload.invoiceId).toBe("invoice-1");
    expect(payload.groupNumber).toBe("GRP-1");
  });
});
