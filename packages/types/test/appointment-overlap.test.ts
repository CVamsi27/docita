import { describe, expect, it } from "vitest";
import {
  appointmentOverlapErrorSchema,
  appointmentOverlapResponseSchema,
} from "../src/contracts/appointments";

const payload = {
  code: "APPOINTMENT_OVERLAP",
  detail: "Doctor has conflicting appointment",
  validationErrors: { startTime: "Doctor has conflicting appointment" },
};
const response = {
  ...payload,
  type: "about:blank",
  title: "Bad Request",
  status: 400,
  instance: "/api/v1/appointments",
  timestamp: "2026-10-08T00:00:00.000Z",
};

describe("appointment overlap wire contract", () => {
  it("accepts the canonical exception payload and RFC response", () => {
    expect(appointmentOverlapErrorSchema).toBeDefined();
    expect(appointmentOverlapErrorSchema.parse(payload)).toEqual(payload);
    expect(appointmentOverlapResponseSchema.parse(response)).toEqual(response);
  });
  it("rejects a wrong status or code and missing start-time guidance", () => {
    expect(appointmentOverlapResponseSchema).toBeDefined();
    for (const invalid of [
      { ...response, status: 409 },
      { ...response, code: "OTHER" },
      { ...response, validationErrors: {} },
      { ...response, validationErrors: undefined },
    ])
      expect(appointmentOverlapResponseSchema.safeParse(invalid).success).toBe(
        false,
      );
  });
});
