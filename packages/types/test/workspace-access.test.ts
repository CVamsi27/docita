import { describe, expect, it } from "vitest";
import {
  APP_ACCESS_TARGETS,
  isFrontDeskBlockedAccessTarget,
  shouldDenyAccessForWorkspaceProfile,
} from "../src";

describe("workspace-access", () => {
  it("denies blocked targets for FRONT_DESK and clinic roles", () => {
    expect(
      shouldDenyAccessForWorkspaceProfile(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "FRONT_DESK",
      ),
    ).toBe(true);
    expect(
      shouldDenyAccessForWorkspaceProfile(
        APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
        "RECEPTIONIST",
        "FRONT_DESK",
      ),
    ).toBe(true);
  });

  it("does not deny INTERNAL for blocked targets under FRONT_DESK", () => {
    expect(
      shouldDenyAccessForWorkspaceProfile(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "INTERNAL",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });

  it("does not deny when workspace is full clinical", () => {
    expect(
      shouldDenyAccessForWorkspaceProfile(
        APP_ACCESS_TARGETS.PAGE_CONSULTATION,
        "DOCTOR",
        "FULL_CLINICAL",
      ),
    ).toBe(false);
  });

  it("does not deny non-clinical targets under FRONT_DESK", () => {
    expect(
      shouldDenyAccessForWorkspaceProfile(
        APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
        "DOCTOR",
        "FRONT_DESK",
      ),
    ).toBe(false);
  });

  it("isFrontDeskBlockedAccessTarget matches consultation page", () => {
    expect(isFrontDeskBlockedAccessTarget(APP_ACCESS_TARGETS.PAGE_CONSULTATION))
      .toBe(true);
  });
});
