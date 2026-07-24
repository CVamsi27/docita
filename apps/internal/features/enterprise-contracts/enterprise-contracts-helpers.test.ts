import { describe, expect, it } from "vitest";
import {
  BLANK_ENTERPRISE_CONTRACT_FORM,
  buildEnterpriseContractUpsertPayload,
  centsToInr,
  computeContractTotals,
  deriveContractsTableStatus,
  inrToCents,
  validateContractForm,
} from "./enterprise-contracts-helpers";

// Minimal row shape for the pure aggregate helpers.
type Row = Parameters<typeof computeContractTotals>[0][number];
function makeRow(status: string, platformFeeCents: number): Row {
  return { status, platformFeeCents } as Row;
}

describe("inrToCents / centsToInr", () => {
  it("converts a rupee string to integer paise, rounding", () => {
    expect(inrToCents("100")).toBe(10000);
    expect(inrToCents(" 19.99 ")).toBe(1999);
  });

  it("clamps invalid or negative input to 0", () => {
    expect(inrToCents("abc")).toBe(0);
    expect(inrToCents("-5")).toBe(0);
  });

  it("formats paise back to rupees, trimming trailing .00", () => {
    expect(centsToInr(10000)).toBe("100");
    expect(centsToInr(1999)).toBe("19.99");
    expect(centsToInr(0)).toBe("0");
  });

  it("round-trips a whole-rupee amount", () => {
    expect(centsToInr(inrToCents("2500"))).toBe("2500");
  });
});

describe("computeContractTotals", () => {
  it("counts by status and sums MRR over ACTIVE platform fees only", () => {
    const totals = computeContractTotals([
      makeRow("ACTIVE", 100000),
      makeRow("ACTIVE", 50000),
      makeRow("DRAFT", 999999),
    ]);
    expect(totals.total).toBe(3);
    expect(totals.active).toBe(2);
    expect(totals.draft).toBe(1);
    expect(totals.mrrCents).toBe(150000);
  });

  it("returns zeros for an empty contract list", () => {
    expect(computeContractTotals([])).toEqual({
      total: 0,
      active: 0,
      draft: 0,
      mrrCents: 0,
    });
  });
});

describe("deriveContractsTableStatus", () => {
  it("prioritizes loading, then error, then empty vs success", () => {
    expect(deriveContractsTableStatus(true, null, [])).toBe("loading");
    expect(deriveContractsTableStatus(false, "boom", [1])).toBe("error");
    expect(deriveContractsTableStatus(false, null, [])).toBe("empty");
    expect(deriveContractsTableStatus(false, null, [1])).toBe("success");
  });
});

describe("validateContractForm", () => {
  it("rejects a form missing required identity/date fields", () => {
    expect(validateContractForm(BLANK_ENTERPRISE_CONTRACT_FORM)).toMatch(
      /required/,
    );
  });

  it("accepts a form with the required fields populated", () => {
    const form = {
      ...BLANK_ENTERPRISE_CONTRACT_FORM,
      primaryClinicId: "clinic_1",
      contractNumber: "ENT-001",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };
    expect(validateContractForm(form)).toBeNull();
  });
});

describe("buildEnterpriseContractUpsertPayload", () => {
  it("converts INR form fields to cents and coerces counts", () => {
    const form = {
      ...BLANK_ENTERPRISE_CONTRACT_FORM,
      contractNumber: "ENT-002",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      platformFeeINR: "5000",
      includedUsers: "10",
      setupFeeINR: "2500",
    };
    const payload = buildEnterpriseContractUpsertPayload(form);
    expect(payload.platformFeeCents).toBe(500000);
    expect(payload.setupFeeCents).toBe(250000);
    expect(payload.includedUsers).toBe(10);
    expect(payload.startDate).toBe(new Date("2026-01-01").toISOString());
  });

  it("defaults includedBranches to 1 and trueUpThreshold to 130", () => {
    const payload = buildEnterpriseContractUpsertPayload({
      ...BLANK_ENTERPRISE_CONTRACT_FORM,
      contractNumber: "ENT-003",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(payload.includedBranches).toBe(1);
    expect(payload.trueUpThresholdPercent).toBe(130);
  });
});
