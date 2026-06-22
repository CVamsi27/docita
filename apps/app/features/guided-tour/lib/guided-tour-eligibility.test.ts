import { describe, expect, it } from "vitest";
import {
  shouldAutoStartTour,
  shouldShowChecklist,
  type ChecklistVisibilityInput,
  type TourEligibilityInput,
} from "./guided-tour-eligibility";

const eligible: TourEligibilityInput = {
  flagEnabled: true,
  isAdmin: true,
  onboardingCompleted: true,
  isNewClinic: true,
  serverStatus: "NOT_STARTED",
};

describe("shouldAutoStartTour", () => {
  it("returns true only when every gate passes", () => {
    expect(shouldAutoStartTour(eligible)).toBe(true);
  });

  it.each<[string, Partial<TourEligibilityInput>]>([
    ["flag off", { flagEnabled: false }],
    ["flag still loading", { flagEnabled: undefined }],
    ["not an admin", { isAdmin: false }],
    ["onboarding incomplete", { onboardingCompleted: false }],
    ["not a new clinic", { isNewClinic: false }],
    ["tour already in progress", { serverStatus: "IN_PROGRESS" }],
    ["tour already completed", { serverStatus: "COMPLETED" }],
    ["tour already skipped", { serverStatus: "SKIPPED" }],
    ["server status still loading", { serverStatus: undefined }],
  ])("returns false when %s", (_label, override) => {
    expect(shouldAutoStartTour({ ...eligible, ...override })).toBe(false);
  });
});

describe("shouldShowChecklist", () => {
  const visible: ChecklistVisibilityInput = {
    flagEnabled: true,
    isAdmin: true,
    checklistDismissed: false,
  };

  it("shows for an admin with the flag on and not dismissed", () => {
    expect(shouldShowChecklist(visible)).toBe(true);
  });

  it.each<[string, Partial<ChecklistVisibilityInput>]>([
    ["flag off", { flagEnabled: false }],
    ["flag still loading", { flagEnabled: undefined }],
    ["not an admin", { isAdmin: false }],
    ["dismissed", { checklistDismissed: true }],
  ])("hides when %s", (_label, override) => {
    expect(shouldShowChecklist({ ...visible, ...override })).toBe(false);
  });
});
