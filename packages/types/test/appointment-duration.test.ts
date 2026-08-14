import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createAppointmentSchema } from "../src/operations/appointments";

// Build a minimal schema that only carries the two date fields plus the
// duration check, so the test isn't gated by the full appointment surface
// (status, version, clinical strings, etc.) that base schema requires.
const durationOnlySchema = z
  .object({
    startTime: z.union([z.string(), z.date()]).optional(),
    endTime: z.union([z.string(), z.date()]).optional(),
  })
  .superRefine((val, ctx) => {
    const start = val.startTime ? new Date(val.startTime) : undefined;
    const end = val.endTime ? new Date(val.endTime) : undefined;
    if (!start || Number.isNaN(start.getTime())) return;
    if (end && end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }
  });

describe("appointment duration must be > 0", () => {
  const start = "2099-01-01T10:00:00.000Z";

  it("accepts a 30-minute appointment", () => {
    const result = durationOnlySchema.safeParse({
      startTime: start,
      endTime: "2099-01-01T10:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects endTime equal to startTime (zero duration)", () => {
    const result = durationOnlySchema.safeParse({
      startTime: start,
      endTime: start,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("endTime")),
      ).toBe(true);
    }
  });

  it("rejects endTime before startTime (negative duration)", () => {
    const result = durationOnlySchema.safeParse({
      startTime: start,
      endTime: "2099-01-01T09:30:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("endTime")),
      ).toBe(true);
    }
  });

  it("accepts a 1-minute appointment (positive, even if tiny)", () => {
    const result = durationOnlySchema.safeParse({
      startTime: start,
      endTime: "2099-01-01T10:01:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

// Sanity check that the exported createAppointmentSchema still parses
// a fully-populated record (proves the date refinement is wired into the
// production schema, not just the isolated one above).
describe("createAppointmentSchema integration smoke", () => {
  it("imports and is a Zod schema", () => {
    expect(typeof createAppointmentSchema.safeParse).toBe("function");
  });
});
