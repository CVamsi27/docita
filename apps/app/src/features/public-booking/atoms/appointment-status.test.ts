import { describe, expect, it } from "vitest";
import { appointmentStatusSchema } from "@workspace/types";
import { enMessages, hiMessages } from "@/messages";
import {
  appointmentStatusKey,
  appointmentTimelineAccent,
} from "./booking-constants";

/** Resolve a dotted key inside the PublicBooking subtree, requiring a string leaf. */
function resolve(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

const STATUSES = appointmentStatusSchema.options;

/**
 * The public-booking context endpoint returns appointment status through
 * `normalizeBookingStatus`, which lowercases and kebab-cases the Prisma enum
 * (`SCHEDULED` -> `scheduled`, `NO_SHOW` -> `no-show`). Both helpers here used
 * to key off the UPPERCASE spelling, so every status fell through to its
 * fallback: patients saw the raw token ("booked", "no-show") in the Recent
 * visits timeline and every entry rendered with the default accent colour
 * instead of success/danger/warning.
 *
 * These tests pin the response casing so the mapping cannot silently drift
 * away from the endpoint again.
 */
describe("public-booking appointment status mapping", () => {
  const en = (enMessages as Record<string, unknown>).PublicBooking;
  const hi = (hiMessages as Record<string, unknown>).PublicBooking;

  it("maps every canonical status to a catalog key that resolves in both locales", () => {
    const problems: string[] = [];
    for (const status of STATUSES) {
      const key = appointmentStatusKey(status);
      if (key === null) {
        problems.push(`no key for canonical status "${status}"`);
        continue;
      }
      if (!resolve(en, key)) problems.push(`en missing ${key}`);
      if (!resolve(hi, key)) problems.push(`hi missing ${key}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("accepts the response casing the context endpoint actually emits", () => {
    // normalizeBookingStatus lowercases and kebab-cases; these are the exact
    // shapes patients' timeline entries arrive in.
    for (const status of STATUSES) {
      expect(appointmentStatusKey(status.toUpperCase()), status).not.toBeNull();
      expect(appointmentStatusKey(status.replace(/-/g, "_").toUpperCase()), status).not.toBeNull();
    }
  });

  it("covers the endpoint's BOOKED state, which is outside the canonical enum", () => {
    // public-booking-creation.service.spec asserts the endpoint returns
    // 'booked' for a BOOKED appointment, so it reaches the patient timeline.
    const key = appointmentStatusKey("booked");
    expect(key).not.toBeNull();
    expect(resolve(en, key ?? "")).toBeTruthy();
    expect(resolve(hi, key ?? "")).toBeTruthy();
  });

  it("returns null for a status it cannot name rather than leaking the token", () => {
    expect(appointmentStatusKey("something-unmapped")).toBeNull();
  });

  it("gives terminal and active states distinct accents", () => {
    expect(appointmentTimelineAccent("completed")).toBe("success");
    expect(appointmentTimelineAccent("confirmed")).toBe("success");
    expect(appointmentTimelineAccent("cancelled")).toBe("danger");
    expect(appointmentTimelineAccent("no-show")).toBe("danger");
    expect(appointmentTimelineAccent("scheduled")).toBe("warning");
    expect(appointmentTimelineAccent("in-progress")).toBe("warning");
    expect(appointmentTimelineAccent("checked-in")).toBe("warning");
    // Uppercase spellings must resolve identically, not silently degrade.
    expect(appointmentTimelineAccent("COMPLETED")).toBe("success");
    expect(appointmentTimelineAccent("NO_SHOW")).toBe("danger");
    // An unknown state stays neutral rather than being coloured as an error.
    expect(appointmentTimelineAccent("something-unmapped")).toBe("default");
  });
});