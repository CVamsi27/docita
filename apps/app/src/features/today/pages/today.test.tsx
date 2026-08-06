import { describe, expect, it } from "vitest";
import { TodayPage } from "./today";

// P2.1 T-density smoke: prove the feature module loads and the page export is a
// renderable React component. TodayPageContent pulls clinic/ask-ai/permissions/
// dashboard-logic contexts, so a full render needs those fixtures — tracked under
// the feature-test-density backlog. Mirrors the settings-* page smoke pattern.
describe("TodayPage (smoke)", () => {
  it("exports a component", () => {
    expect(typeof TodayPage).toBe("function");
  });
});
