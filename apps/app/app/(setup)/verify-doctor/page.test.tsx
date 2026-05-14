import { describe, expect, it } from "vitest";
import { shouldRedirectToWorkspace } from "./redirect-logic";

describe("shouldRedirectToWorkspace", () => {
  it("redirects only after signature and saved registration are both present", () => {
    expect(shouldRedirectToWorkspace(true, true)).toBe(true);
    expect(shouldRedirectToWorkspace(true, false)).toBe(false);
    expect(shouldRedirectToWorkspace(false, true)).toBe(false);
    expect(shouldRedirectToWorkspace(false, false)).toBe(false);
  });
});
