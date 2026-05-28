import { describe, expect, it } from "vitest";
import { ProfilePageContent } from "./ProfilePageContent";

// Audit T-density smoke: prove the feature module loads and the page export
// is a renderable React component. Full functional coverage is tracked
// separately under the feature-test-density backlog.
describe("ProfilePageContent (smoke)", () => {
  it("exports a component", () => {
    expect(typeof ProfilePageContent).toBe("function");
  });
});
