import { describe, expect, it } from "vitest";
import { APIRequestError } from "@workspace/data-access";
import {
  isExpectedAccessFailure,
  logPayloadFromError,
  parseFollowUpList,
} from "./follow-up-helpers";

const validFollowUp = {
  id: "fu_1",
  scheduledDate: "2026-08-10",
  reason: "Review reports",
  status: "scheduled",
  patient: { id: "p_1", firstName: "Asha", lastName: "Rao" },
  doctor: { id: "d_1", name: "Dr. Mehta" },
};

describe("parseFollowUpList", () => {
  it("returns an empty list for non-array payloads", () => {
    expect(parseFollowUpList(undefined)).toEqual([]);
    expect(parseFollowUpList(null)).toEqual([]);
    expect(parseFollowUpList({ items: [] })).toEqual([]);
  });

  it("parses valid follow-ups", () => {
    const parsed = parseFollowUpList([validFollowUp]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("fu_1");
    expect(parsed[0].patient.firstName).toBe("Asha");
  });

  it("drops malformed entries without throwing", () => {
    const parsed = parseFollowUpList([
      validFollowUp,
      { id: "fu_2" }, // missing patient/doctor/schedule
      "not-an-object",
    ]);
    expect(parsed).toHaveLength(1);
  });
});

describe("isExpectedAccessFailure", () => {
  it("accepts 401/403/404 API errors", () => {
    for (const status of [401, 403, 404]) {
      expect(isExpectedAccessFailure(new APIRequestError("nope", { status }))).toBe(true);
    }
  });

  it("rejects other statuses and non-API errors", () => {
    expect(isExpectedAccessFailure(new APIRequestError("boom", { status: 500 }))).toBe(false);
    expect(isExpectedAccessFailure(new Error("boom"))).toBe(false);
    expect(isExpectedAccessFailure("boom")).toBe(false);
  });
});

describe("logPayloadFromError", () => {
  it("surfaces status/code for API errors", () => {
    expect(
      logPayloadFromError(new APIRequestError("nope", { status: 403, code: "FORBIDDEN" })),
    ).toEqual({ status: 403, code: "FORBIDDEN" });
  });

  it("falls back to the message for plain errors", () => {
    expect(logPayloadFromError(new Error("boom"))).toEqual({ error: "boom" });
  });
});
