import { describe, expect, it } from "vitest";
import {
  centsToMajor,
  CLAIM_STATUS_LABELS,
  CLAIM_STATUS_TRANSITIONS,
  CLAIM_TYPE_LABELS,
} from "./claim-display";

describe("insurance claim display rules", () => {
  it("keeps submitted claims inside the review state machine", () => {
    expect(CLAIM_STATUS_TRANSITIONS.SUBMITTED).toEqual([
      "INFO_REQUESTED",
      "APPROVED",
      "PARTIALLY_APPROVED",
      "DENIED",
      "CANCELLED",
    ]);
    expect(CLAIM_STATUS_TRANSITIONS.INFO_REQUESTED).toContain("SUBMITTED");
    expect(CLAIM_STATUS_TRANSITIONS.DENIED).toContain("APPEALED");
  });

  it("treats settled and cancelled claims as terminal", () => {
    expect(CLAIM_STATUS_TRANSITIONS.SETTLED).toEqual([]);
    expect(CLAIM_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("provides clinician-facing labels for claim statuses and types", () => {
    expect(CLAIM_STATUS_LABELS.PARTIALLY_APPROVED).toBe("Partially approved");
    expect(CLAIM_TYPE_LABELS.PRE_AUTH).toBe("Pre-authorization");
  });

  it("converts persisted minor units into display major units", () => {
    expect(centsToMajor(12345)).toBe(123.45);
    expect(centsToMajor(null)).toBe(0);
  });
});
