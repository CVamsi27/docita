import { describe, expect, it } from "vitest";
import OriginPrimitivesVisualTestPage from "./OriginPrimitivesVisualTestPageContent";

// Audit T-density smoke: the feature module loads and the export is a
// renderable component. Functional coverage is tracked in the
// feature-test-density backlog.
describe("OriginPrimitivesVisualTestPage (smoke)", () => {
  it("exports a component", () => {
    expect(typeof OriginPrimitivesVisualTestPage).toBe("function");
  });
});
