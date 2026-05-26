import { describe, expect, it } from "vitest";
import {
  createWebVitalsBeaconBody,
  shouldReportWebVitals,
  WEB_VITALS_REPORTING_PATH,
} from "./web-vitals-reporter";

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

  it("reports through the same-origin app route to avoid browser CORS", () => {
    expect(WEB_VITALS_REPORTING_PATH).toBe("/api/v1/monitoring/web-vitals");
  });

  it("creates an application/json beacon body", async () => {
    const body = createWebVitalsBeaconBody({
      name: "LCP",
      value: 1234,
      rating: "good",
    });

    expect(body).toBeInstanceOf(Blob);
    expect(body.type).toBe("application/json");
    expect(body.size).toBeGreaterThan(0);
  });
});
