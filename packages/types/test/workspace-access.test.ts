import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_TARGETS,
  shouldDenyAccessForFrontDeskTier,
} from "../src";

describe("shouldDenyAccessForFrontDeskTier", () => {
  it("denies consultation for non-internal roles on FRONT_DESK tier", () => {
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "FRONT_DESK",
      ),
    ).toBe(true);
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "RECEPTIONIST",
        "FRONT_DESK",
      ),
    ).toBe(true);
  });

  it("allows INTERNAL on FRONT_DESK tier", () => {
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "INTERNAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });

  it("does not deny on non-front-desk tiers", () => {
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "ESSENTIAL",
      ),
    ).toBe(false);
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "PROFESSIONAL",
      ),
    ).toBe(false);
  });

  it("does not deny non-blocked targets on FRONT_DESK tier", () => {
    expect(
      shouldDenyAccessForFrontDeskTier(
        APP_ACCESS_TARGETS.PAGE_INVOICES,
        "RECEPTIONIST",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });
});
