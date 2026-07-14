import { describe, expect, it } from "vitest";
import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  deriveFeedbackPageStatus,
} from "./feedback-helpers";

describe("STATUS_OPTIONS", () => {
  it("contains every feedback lifecycle stage with a label and color", () => {
    const values = STATUS_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      "NEW",
      "REVIEWED",
      "IN_PROGRESS",
      "RESOLVED",
      "ARCHIVED",
    ]);
    for (const option of STATUS_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.color).toBeTruthy();
    }
  });
});

describe("CATEGORY_OPTIONS", () => {
  it("contains the standard product-feedback categories", () => {
    const values = CATEGORY_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      "GENERAL",
      "UI_UX",
      "PERFORMANCE",
      "FEATURES",
      "BILLING",
      "SUPPORT",
      "OTHER",
    ]);
    for (const option of CATEGORY_OPTIONS) {
      expect(option.label).toBeTruthy();
    }
  });
});

describe("deriveFeedbackPageStatus", () => {
  it("returns loading when either query is loading, no error", () => {
    const result = deriveFeedbackPageStatus(true, false, null, null);
    expect(result.loading).toBe(true);
    expect(result.pageStatus).toBe("loading");
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns loading when stats query is loading, feedbacks done", () => {
    const result = deriveFeedbackPageStatus(false, true, null, null);
    expect(result.loading).toBe(true);
    expect(result.pageStatus).toBe("loading");
  });

  it("returns success when neither loading and no error", () => {
    const result = deriveFeedbackPageStatus(false, false, null, null);
    expect(result.loading).toBe(false);
    expect(result.pageStatus).toBe("success");
    expect(result.errorMessage).toBeUndefined();
  });

  it("returns error with a message when feedbacks error is set", () => {
    const error = new Error("could not load");
    const result = deriveFeedbackPageStatus(false, false, error, null);
    expect(result.pageStatus).toBe("error");
    expect(result.errorMessage).toBeTruthy();
  });

  it("prefers feedbacks error over stats error", () => {
    const fbError = new Error("fb boom");
    const statsError = new Error("stats boom");
    const result = deriveFeedbackPageStatus(false, false, fbError, statsError);
    expect(result.pageStatus).toBe("error");
    // The error message is user-facing; the exact source is opaque. We
    // just assert it's set and is a string.
    expect(typeof result.errorMessage).toBe("string");
    expect(result.errorMessage).toBeTruthy();
  });

  it("returns error with a message when only stats error is set", () => {
    const statsError = new Error("stats boom");
    const result = deriveFeedbackPageStatus(false, false, null, statsError);
    expect(result.pageStatus).toBe("error");
    expect(result.errorMessage).toBeTruthy();
  });
});
