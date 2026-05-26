import { describe, expect, it } from "vitest";
import { TemplatesPageContent } from "./TemplatesPageContent";

// Audit T-density smoke: prove the feature module loads and the page export
// is a renderable React component. Full functional coverage is tracked
// separately under the feature-test-density backlog.
describe("TemplatesPageContent (smoke)", () => {
  it("exports a component", () => {
    expect(typeof TemplatesPageContent).toBe("function");
  });
});
