import { describe, expect, it } from "vitest";
import { shouldReportWebVitals } from "./web-vitals-reporter";

describe("shouldReportWebVitals", () => {
  it("skips public auth routes", () => {
    expect(shouldReportWebVitals("/login")).toBe(false);
    expect(shouldReportWebVitals("/register")).toBe(false);
    expect(shouldReportWebVitals("/forgot-password")).toBe(false);
    expect(shouldReportWebVitals("/reset-password")).toBe(false);
    expect(shouldReportWebVitals("/portal/login")).toBe(false);
  });

  it("reports on application routes", () => {
    expect(shouldReportWebVitals("/dashboard")).toBe(true);
    expect(shouldReportWebVitals("/patients")).toBe(true);
    expect(shouldReportWebVitals("/settings/profile")).toBe(true);
  });
});
