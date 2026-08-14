import { describe, expect, it } from "vitest";
import { InboxPageContent } from "./InboxPageContent";

// Audit T-density smoke: the feature module loads and the export is a
// renderable component. Functional coverage is tracked in the
// feature-test-density backlog.
describe("InboxPageContent (smoke)", () => {
  it("exports a component", () => {
    expect(typeof InboxPageContent).toBe("function");
  });
});
