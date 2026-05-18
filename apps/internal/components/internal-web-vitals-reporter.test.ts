import { describe, expect, it } from "vitest";
import { shouldReportInternalWebVitals } from "./internal-web-vitals-reporter";

describe("shouldReportInternalWebVitals", () => {
  it("skips the public internal login route", () => {
    expect(shouldReportInternalWebVitals("/")).toBe(false);
  });

  it("reports on protected internal routes", () => {
    expect(shouldReportInternalWebVitals("/dashboard")).toBe(true);
    expect(shouldReportInternalWebVitals("/system-monitoring")).toBe(true);
  });
});
