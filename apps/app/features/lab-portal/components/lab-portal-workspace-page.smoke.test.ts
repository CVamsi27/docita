import { describe, expect, it } from "vitest";
import { LabPortalWorkspacePage } from "./lab-portal-workspace-page";

// Audit T-density smoke: the feature module loads and the export is a
// renderable component. Functional coverage is tracked in the
// feature-test-density backlog.
describe("LabPortalWorkspacePage (smoke)", () => {
  it("exports a component", () => {
    expect(typeof LabPortalWorkspacePage).toBe("function");
  });
});
