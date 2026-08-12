import { describe, expect, it } from "vitest";
import { FAQSection, HelpCenter } from "./index";

// Audit T-density smoke: the feature module loads and its exports are
// renderable components. Functional coverage is tracked in the
// feature-test-density backlog.
describe("help components (smoke)", () => {
  it("exports renderable components", () => {
    expect(typeof HelpCenter).toBe("function");
    expect(typeof FAQSection).toBe("function");
  });
});
