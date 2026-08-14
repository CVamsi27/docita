import { describe, expect, it } from "vitest";
import {
  buildMetrics,
  formatChange,
  resolveTrend,
} from "./analytics-helpers";
import type { InternalAnalyticsData } from "@workspace/data-access/internal";

describe("formatChange", () => {
  it("returns undefined for nullish and zero values", () => {
    expect(formatChange(undefined)).toBeUndefined();
    expect(formatChange(null)).toBeUndefined();
    expect(formatChange(0)).toBeUndefined();
  });

  it("prepends + for positive changes with one decimal", () => {
    expect(formatChange(12.34)).toBe("+12.3%");
    expect(formatChange(0.5)).toBe("+0.5%");
  });

  it("leaves negatives unsigned", () => {
    expect(formatChange(-4.567)).toBe("-4.6%");
  });
});

describe("resolveTrend", () => {
  it("returns neutral for nullish and zero values", () => {
    expect(resolveTrend(undefined)).toBe("neutral");
    expect(resolveTrend(null)).toBe("neutral");
    expect(resolveTrend(0)).toBe("neutral");
  });

  it("returns up for positive values", () => {
    expect(resolveTrend(1)).toBe("up");
    expect(resolveTrend(0.01)).toBe("up");
  });

  it("returns down for negative values", () => {
    expect(resolveTrend(-1)).toBe("down");
    expect(resolveTrend(-0.01)).toBe("down");
  });
});

describe("buildMetrics", () => {
  const data: InternalAnalyticsData = {
    revenue: 1_250_000,
    appointments: 320,
    newPatients: 41,
    avgInvoiceValue: 850,
    revenueChange: 12.34,
    appointmentsChange: -3.2,
    patientsChange: 5,
    invoiceValueChange: 0,
  };

  it("derives all four metric cards from data", () => {
    const metrics = buildMetrics(data);

    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toMatchObject({
      title: "Total Revenue",
      change: "+12.3%",
      trend: "up",
    });
    expect(metrics[1]).toMatchObject({
      title: "Appointments",
      value: "320",
      change: "-3.2%",
      trend: "down",
    });
    expect(metrics[2]).toMatchObject({
      title: "New Patients",
      value: "41",
      change: "+5.0%",
      trend: "up",
    });
    expect(metrics[3]).toMatchObject({
      title: "Avg Invoice Value",
      change: undefined,
      trend: "neutral",
    });
  });

  it("renders revenue through the compact currency formatter", () => {
    const metrics = buildMetrics(data);
    expect(metrics[0].value).toBe("₹12.5L");
  });

  it("falls back to zeroed values when data is null", () => {
    const metrics = buildMetrics(null);

    expect(metrics).toHaveLength(4);
    for (const metric of metrics) {
      expect(metric.change).toBeUndefined();
      expect(metric.trend).toBe("neutral");
    }
    expect(metrics[0].value).toBe("₹0");
    expect(metrics[1].value).toBe("0");
    expect(metrics[3].value).toBe("₹0");
  });

  it("zeroes each metric when a field is missing", () => {
    const partial = {
      revenue: 0,
      appointments: undefined,
      newPatients: undefined,
      avgInvoiceValue: 0,
    } as unknown as InternalAnalyticsData;

    const metrics = buildMetrics(partial);
    expect(metrics[1].value).toBe("0");
    expect(metrics[2].value).toBe("0");
    expect(metrics[0].change).toBeUndefined();
  });

  it("attaches an icon element to each metric", () => {
    for (const metric of buildMetrics(data)) {
      expect(metric.icon).not.toBeNull();
      expect(metric.icon).toBeDefined();
    }
  });
});
