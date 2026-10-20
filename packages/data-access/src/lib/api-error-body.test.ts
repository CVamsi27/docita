import { describe, expect, it } from "vitest";
import { parseProblemDetailsFromJson } from "./api-error-body";
import { buildApiRequestError } from "./client-response-handler";

const overlap = {
  type: "about:blank",
  title: "Bad Request",
  status: 400,
  detail: "Doctor has conflicting appointment",
  code: "APPOINTMENT_OVERLAP",
  instance: "/api/v1/appointments",
  timestamp: "2026-10-08T00:00:00.000Z",
  validationErrors: { startTime: "Doctor has conflicting appointment" },
};

describe("appointment overlap client errors", () => {
  it("normalizes a recognized overlap through the shared schema", () => {
    expect(
      parseProblemDetailsFromJson({ ...overlap, unexpected: "untrusted" }).raw,
    ).toEqual(overlap);
  });
  it("preserves code and field guidance on the real request error", async () => {
    const error = await buildApiRequestError(
      new Response(JSON.stringify(overlap), { status: 400 }),
    );
    expect(error.code).toBe("APPOINTMENT_OVERLAP");
    expect(error.message).toBe(overlap.detail);
    expect(error.fieldErrors).toEqual(overlap.validationErrors);
  });
  it("retains legacy and unrelated errors without treating them as overlaps", () => {
    const legacy = {
      message: "Legacy invalid input",
      code: "OTHER",
      validationErrors: { name: "Required", invalid: 12 },
    };
    expect(parseProblemDetailsFromJson(legacy)).toMatchObject({
      message: legacy.message,
      validationErrors: { name: "Required" },
      raw: legacy,
    });
    for (const malformed of [null, [], "invalid"])
      expect(parseProblemDetailsFromJson(malformed)).toEqual({ raw: null });
  });
});
