import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_TARGETS,
  shouldDenyAccessForFrontDeskMode,
} from "../src";

describe("shouldDenyAccessForFrontDeskMode", () => {
  it("denies consultation for non-internal roles on FRONT_DESK mode", () => {
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "ESSENTIAL",
        "FRONT_DESK",
      ),
    ).toBe(true);
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "RECEPTIONIST",
        "PROFESSIONAL",
        "FRONT_DESK",
      ),
    ).toBe(true);
  });

  it("allows INTERNAL on FRONT_DESK mode", () => {
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "INTERNAL",
        "ESSENTIAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });

  it("does not deny on non-front-desk modes", () => {
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "ESSENTIAL",
        "FULL",
      ),
    ).toBe(false);
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "PROFESSIONAL",
        "FULL",
      ),
    ).toBe(false);
  });

  it("does not deny non-blocked targets on FRONT_DESK mode", () => {
    expect(
      shouldDenyAccessForFrontDeskMode(
        APP_ACCESS_TARGETS.PAGE_INVOICES,
        "RECEPTIONIST",
        "ESSENTIAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });
});
