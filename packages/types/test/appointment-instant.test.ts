import { describe, expect, it } from "vitest";
import { normalizeAppointmentInstant } from "../src/operations/appointments";

describe("normalizeAppointmentInstant", () => {
  it("parses clinic-wall naive datetime in Asia/Kolkata", () => {
    const instant = normalizeAppointmentInstant(
      "2026-05-28T14:00",
      "Asia/Kolkata",
    );
    expect(instant?.toISOString()).toBe("2026-05-28T08:30:00.000Z");
  });

  it("accepts UTC ISO strings from clients", () => {
    const instant = normalizeAppointmentInstant(
      "2026-05-28T08:30:00.000Z",
      "Asia/Kolkata",
    );
    expect(instant?.toISOString()).toBe("2026-05-28T08:30:00.000Z");
  });
});
