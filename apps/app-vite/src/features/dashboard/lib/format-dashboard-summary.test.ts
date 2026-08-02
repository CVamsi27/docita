import { describe, expect, it } from "vitest";
import { formatDashboardSummary } from "./format-dashboard-summary";

describe("formatDashboardSummary", () => {
  it("returns undefined when there are no appointments and no waiting patients", () => {
    expect(formatDashboardSummary(0, 0)).toBeUndefined();
  });

  it("handles singular appointment", () => {
    expect(formatDashboardSummary(1, 0)).toBe("1 appointment today");
  });

  it("handles plural appointments", () => {
    expect(formatDashboardSummary(3, 0)).toBe("3 appointments today");
  });

  it("handles waiting count only", () => {
    expect(formatDashboardSummary(0, 2)).toBe("2 waiting");
  });

  it("combines appointments and waiting count", () => {
    expect(formatDashboardSummary(5, 3)).toBe("5 appointments today · 3 waiting");
  });

  it("handles singular waiting count", () => {
    expect(formatDashboardSummary(0, 1)).toBe("1 waiting");
  });
});
