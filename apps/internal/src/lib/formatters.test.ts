import { describe, it, expect, vi } from "vitest";
import {
  formatInternalTimestamp,
  formatInternalListDate,
  formatDistanceToNow,
  formatCurrency,
  formatDate,
} from "./formatters";

describe("formatInternalTimestamp", () => {
  it("formats a date string correctly", () => {
    const result = formatInternalTimestamp("2025-06-15T10:30:00Z");
    expect(result).toContain("15 Jun 2025");
  });

  it("formats a Date object correctly", () => {
    const d = new Date("2025-06-15T10:30:00Z");
    const result = formatInternalTimestamp(d);
    expect(result).toContain("Jun");
    expect(result).toContain("2025");
  });

  it("handles invalid date gracefully", () => {
    const d = new Date("invalid");
    const result = formatInternalTimestamp(d);
    expect(result).toBe("Invalid Date");
  });
});

describe("formatInternalListDate", () => {
  it("returns date string without time", () => {
    const result = formatInternalListDate("2025-06-15T10:30:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2025");
    expect(result).not.toContain("10:30");
  });
});

describe("formatDistanceToNow", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for dates within the last minute', () => {
    const now = new Date("2025-07-01T12:00:00Z");
    expect(formatDistanceToNow(now)).toBe("just now");
  });

  it('returns "Xm ago" for dates within the last hour', () => {
    const d = new Date("2025-07-01T11:45:00Z");
    expect(formatDistanceToNow(d)).toBe("15m ago");
  });

  it('returns "Xh ago" for dates within the last day', () => {
    const d = new Date("2025-07-01T06:00:00Z");
    expect(formatDistanceToNow(d)).toBe("6h ago");
  });

  it('returns "Xd ago" for dates within the last month', () => {
    const d = new Date("2025-06-25T12:00:00Z");
    expect(formatDistanceToNow(d)).toBe("6d ago");
  });

  it('returns "Xmo ago" for dates older than 30 days', () => {
    const d = new Date("2025-05-01T12:00:00Z");
    expect(formatDistanceToNow(d)).toBe("2mo ago");
  });
});

describe("formatCurrency", () => {
  it("formats in INR by default", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("₹");
    expect(result).toContain("1,500");
  });

  it("formats with custom currency", () => {
    const result = formatCurrency(99.99, { currency: "USD", fractionDigits: 2 });
    expect(result).toContain("$");
    expect(result).toContain("99.99");
  });

  it("formats with zero fraction digits", () => {
    const result = formatCurrency(1000, { fractionDigits: 0 });
    expect(result).not.toContain(".");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("handles large numbers", () => {
    const result = formatCurrency(10000000);
    expect(result).toContain("1,00,00,000");
  });
});

describe("formatDate", () => {
  it("formats a date string with date and time", () => {
    const result = formatDate("2025-06-15T10:30:00Z");
    expect(result).toContain("15 Jun 2025");
  });

  it("formats a Date object", () => {
    const d = new Date("2025-06-15T10:30:00Z");
    const result = formatDate(d);
    expect(result).toContain("Jun");
    expect(result).toContain("2025");
  });
});
