import { describe, expect, it } from "vitest";
import { humanizeUiLabel } from "./label-formatters";

describe("humanizeUiLabel", () => {
  it("replaces underscores and hyphens with spaces", () => {
    expect(humanizeUiLabel("in_progress")).toBe("In Progress");
    expect(humanizeUiLabel("no-show")).toBe("No Show");
  });

  it("normalizes existing spacing without changing readable labels", () => {
    expect(humanizeUiLabel("already spaced")).toBe("Already Spaced");
    expect(humanizeUiLabel("   mixed___value  ")).toBe("Mixed Value");
  });
});
