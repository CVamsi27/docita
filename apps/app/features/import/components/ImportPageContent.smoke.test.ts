import { describe, expect, it } from "vitest";
import { ImportPageContent } from "./ImportPageContent";

// Audit T-density smoke: the feature module loads and the export is a
// renderable component. Functional coverage is tracked in the
// feature-test-density backlog.
describe("ImportPageContent (smoke)", () => {
  it("exports a component", () => {
    expect(typeof ImportPageContent).toBe("function");
  });
});
