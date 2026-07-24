import { describe, expect, it } from "vitest";
import {
  buildHealthSummary,
  computeErrorRate,
  computeHeapUsagePercent,
  computeMaxThroughputCount,
  computeTenantScopeIssueCount,
  computeTenantScopeStatus,
  formatBytesToMb,
} from "./system-monitoring-helpers";

describe("formatBytesToMb", () => {
  it("appends ' MB' to the value", () => {
    expect(formatBytesToMb(0)).toBe("0 MB");
    expect(formatBytesToMb(120)).toBe("120 MB");
  });
});

describe("computeErrorRate", () => {
  it("returns 0 when there are no requests", () => {
    expect(computeErrorRate(0, 0)).toBe(0);
    expect(computeErrorRate(0, 5)).toBe(0);
  });

  it("computes a 2-decimal percentage", () => {
    expect(computeErrorRate(100, 1)).toBe(1);
    expect(computeErrorRate(200, 3)).toBe(1.5);
    expect(computeErrorRate(3, 1)).toBe(33.33);
  });
});

describe("computeHeapUsagePercent", () => {
  it("rounds to nearest integer percent", () => {
    expect(computeHeapUsagePercent(50, 100)).toBe(50);
    expect(computeHeapUsagePercent(33, 100)).toBe(33);
    expect(computeHeapUsagePercent(99, 100)).toBe(99);
  });

  it("uses a 1-byte floor for total so a 0 total never divides by zero", () => {
    expect(computeHeapUsagePercent(0, 0)).toBe(0);
    expect(computeHeapUsagePercent(5, 0)).toBe(500);
  });
});

describe("computeTenantScopeIssueCount", () => {
  it("sums uncovered and stale counts", () => {
    expect(computeTenantScopeIssueCount(3, 2)).toBe(5);
    expect(computeTenantScopeIssueCount(0, 0)).toBe(0);
  });
});

describe("computeTenantScopeStatus", () => {
  it("returns 'critical' when there is an error", () => {
    expect(computeTenantScopeStatus(true, true, 0)).toBe("critical");
  });

  it("returns 'warning' when no data (and no error)", () => {
    expect(computeTenantScopeStatus(false, false, 5)).toBe("warning");
  });

  it("returns 'healthy' when there is data and no issues", () => {
    expect(computeTenantScopeStatus(false, true, 0)).toBe("healthy");
  });

  it("returns 'critical' when there is data and there are issues", () => {
    expect(computeTenantScopeStatus(false, true, 3)).toBe("critical");
  });
});

describe("computeMaxThroughputCount", () => {
  it("returns the max count across items", () => {
    expect(
      computeMaxThroughputCount([{ count: 1 }, { count: 7 }, { count: 3 }]),
    ).toBe(7);
  });

  it("returns 0 for empty input", () => {
    expect(computeMaxThroughputCount([])).toBe(0);
  });

  it("handles negative counts", () => {
    expect(
      computeMaxThroughputCount([{ count: -5 }, { count: 0 }, { count: 1 }]),
    ).toBe(1);
  });
});

describe("buildHealthSummary", () => {
  it("returns null when monitoringHealth is missing", () => {
    expect(buildHealthSummary(null, 10, 0, 0, 50)).toBeNull();
    expect(buildHealthSummary(undefined, 10, 0, 0, 50)).toBeNull();
  });

  it("builds four health summary items when monitoringHealth is present", () => {
    const items = buildHealthSummary(
      { databaseConnected: true },
      120,
      0,
      0,
      250,
    );
    expect(items).toHaveLength(4);
    expect(items?.[0]).toMatchObject({ label: "Database", status: "healthy" });
    expect(items?.[1]).toMatchObject({ label: "Requests" });
    expect(items?.[2]).toMatchObject({ label: "Errors" });
    expect(items?.[3]).toMatchObject({ label: "Response time" });
  });

  it("flags DB offline as critical", () => {
    const items = buildHealthSummary(
      { databaseConnected: false },
      120,
      0,
      0,
      250,
    );
    expect(items?.[0]).toMatchObject({ status: "critical" });
  });

  it("flags zero-traffic as warning on requests", () => {
    const items = buildHealthSummary(
      { databaseConnected: true },
      0,
      0,
      0,
      50,
    );
    expect(items?.[1]).toMatchObject({ status: "warning" });
  });

  it("flags high response time as warning", () => {
    const items = buildHealthSummary(
      { databaseConnected: true },
      10,
      0,
      0,
      1500,
    );
    expect(items?.[3]).toMatchObject({ status: "warning" });
  });
});
