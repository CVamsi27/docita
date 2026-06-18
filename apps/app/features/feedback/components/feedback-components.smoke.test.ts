import { describe, expect, it } from "vitest";
import { FeedbackForm, QuickFeedback } from "./index";

// Audit T-density smoke: the feature module loads and its exports are
// renderable components. Functional coverage is tracked in the
// feature-test-density backlog.
describe("feedback components (smoke)", () => {
  it("exports renderable components", () => {
    expect(typeof FeedbackForm).toBe("function");
    expect(typeof QuickFeedback).toBe("function");
  });
});
