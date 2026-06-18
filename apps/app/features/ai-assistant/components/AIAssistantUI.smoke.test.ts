import { describe, expect, it } from "vitest";
import { AIAssistantUI } from "./AIAssistantUI";

// Audit T-density smoke: the feature module loads and the export is a
// renderable component. Functional coverage is tracked in the
// feature-test-density backlog.
describe("AIAssistantUI (smoke)", () => {
  it("exports a component", () => {
    expect(typeof AIAssistantUI).toBe("function");
  });
});
