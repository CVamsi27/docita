import { describe, expect, it } from "vitest";
import { formatChange, formatCurrency, resolveTrend } from "./analytics-formatters";
import {
  ANALYTICS_EXPORT_ERROR,
  ANALYTICS_LOAD_ERROR_FALLBACK,
  buildAnalyticsParams,
  computeMaxRevenue,
  computePageStatus,
  computeRevenueByMonth,
  computeTierEntries,
  computeTotalTierCount,
} from "./analytics-helpers";

describe("formatCurrency", () => {
  it("formats 0 as plain rupees", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("formats sub-thousand amounts without a suffix", () => {
    expect(formatCurrency(500)).toBe("₹500");
  });

  it("formats thousands with a K suffix", () => {
    expect(formatCurrency(1500)).toBe("₹1.5K");
  });

  it("formats lakhs with an L suffix", () => {
    expect(formatCurrency(250000)).toBe("₹2.5L");
  });

  it("formats the 1000 / 100000 boundaries", () => {
    expect(formatCurrency(1000)).toBe("₹1.0K");
    expect(formatCurrency(100000)).toBe("₹1.0L");
  });
});

describe("formatChange", () => {
  it("returns undefined for 0, undefined, null, or empty", () => {
    expect(formatChange(0)).toBeUndefined();
    expect(formatChange(undefined)).toBeUndefined();
    expect(formatChange(null)).toBeUndefined();
  });

  it("prefixes positive values with +", () => {
    expect(formatChange(12.34)).toBe("+12.3%");
  });

  it("renders negative values with the minus sign", () => {
    expect(formatChange(-3.7)).toBe("-3.7%");
  });
});

describe("resolveTrend", () => {
  it("returns 'neutral' for 0, undefined, null", () => {
    expect(resolveTrend(0)).toBe("neutral");
    expect(resolveTrend(undefined)).toBe("neutral");
    expect(resolveTrend(null)).toBe("neutral");
  });

  it("returns 'up' for positive values", () => {
    expect(resolveTrend(5)).toBe("up");
  });

  it("returns 'down' for negative values", () => {
    expect(resolveTrend(-5)).toBe("down");
  });
});

describe("buildAnalyticsParams", () => {
  it("includes period only when no start/end date", () => {
    expect(buildAnalyticsParams("30d", "", "")).toBe("period=30d");
  });

  it("includes startDate and endDate when provided", () => {
    expect(buildAnalyticsParams("30d", "2024-01-01", "2024-01-31")).toBe(
      "period=30d&startDate=2024-01-01&endDate=2024-01-31",
    );
  });

  it("handles only one of startDate / endDate being set", () => {
    expect(buildAnalyticsParams("30d", "2024-01-01", "")).toBe(
      "period=30d&startDate=2024-01-01",
    );
    expect(buildAnalyticsParams("30d", "", "2024-01-31")).toBe(
      "period=30d&endDate=2024-01-31",
    );
  });
});

describe("computePageStatus", () => {
  it("returns 'loading' when no token", () => {
    expect(computePageStatus(null, false, false, null)).toBe("loading");
  });

  it("returns 'loading' when loading and no data yet", () => {
    expect(computePageStatus("token", true, false, null)).toBe("loading");
  });

  it("returns 'error' when error is present and we have a token", () => {
    expect(
      computePageStatus("token", false, true, new Error("boom")),
    ).toBe("error");
  });

  it("returns 'success' when token ready, no error, regardless of loading when we already have data", () => {
    expect(computePageStatus("token", true, true, null)).toBe("success");
    expect(computePageStatus("token", false, true, null)).toBe("success");
  });
});

describe("computeTierEntries", () => {
  it("returns [] for undefined input", () => {
    expect(computeTierEntries(undefined)).toEqual([]);
  });

  it("sorts entries by count descending", () => {
    const result = computeTierEntries({ CORE: 5, PRO: 20, ENTERPRISE: 10 });
    expect(result).toEqual([
      ["PRO", 20],
      ["ENTERPRISE", 10],
      ["CORE", 5],
    ]);
  });
});

describe("computeTotalTierCount", () => {
  it("sums values", () => {
    expect(
      computeTotalTierCount([
        ["PRO", 20],
        ["ENTERPRISE", 10],
      ]),
    ).toBe(30);
  });

  it("returns 0 for empty input", () => {
    expect(computeTotalTierCount([])).toBe(0);
  });
});

describe("computeRevenueByMonth", () => {
  it("returns [] for undefined input", () => {
    expect(computeRevenueByMonth(undefined)).toEqual([]);
  });

  it("returns the same input for defined data", () => {
    const data = [
      { month: "2024-01", revenue: 100 },
      { month: "2024-02", revenue: 200 },
    ];
    expect(computeRevenueByMonth(data)).toBe(data);
  });
});

describe("computeMaxRevenue", () => {
  it("returns 1 for empty input (so the bar chart can divide by it)", () => {
    expect(computeMaxRevenue([])).toBe(1);
  });

  it("returns the maximum revenue across rows", () => {
    expect(
      computeMaxRevenue([
        { month: "2024-01", revenue: 100 },
        { month: "2024-02", revenue: 250 },
        { month: "2024-03", revenue: 180 },
      ]),
    ).toBe(250);
  });
});

describe("error message constants", () => {
  it("ANALYTICS_LOAD_ERROR_FALLBACK reads as a user message", () => {
    expect(ANALYTICS_LOAD_ERROR_FALLBACK).toMatch(/could not load/i);
  });

  it("ANALYTICS_EXPORT_ERROR reads as a user message", () => {
    expect(ANALYTICS_EXPORT_ERROR).toMatch(/could not export/i);
  });
});
