import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDistanceToNow,
  formatPickerIsoDate,
  formatPickerMonthShort,
  formatRelativeDate,
  formatTime,
} from "./date-formatting.js";

// All assertions use fixed instants so the IST (Asia/Kolkata, UTC+05:30)
// normalization is pinned exactly and independent of the machine's timezone.
describe("formatDate", () => {
  it("renders the default DATE_MEDIUM pattern in Asia/Kolkata", () => {
    expect(formatDate("2025-06-15T10:30:00Z")).toBe("15 Jun 2025");
  });

  it("renders explicit patterns against the instant in Asia/Kolkata", () => {
    expect(formatDate("2025-06-15T10:30:00Z", "d MMM yyyy")).toBe(
      "15 Jun 2025",
    );
    expect(formatDate("2025-06-15T10:30:00Z", "dd/MM/yyyy")).toBe(
      "15/06/2025",
    );
  });

  it("accepts Date objects", () => {
    expect(formatDate(new Date("2025-06-15T10:30:00Z"))).toBe("15 Jun 2025");
  });

  it("returns an empty string for null, undefined, and invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatTime", () => {
  it("renders the default TIME_MEDIUM pattern (12-hour) in Asia/Kolkata", () => {
    expect(formatTime("2025-06-15T10:30:00Z")).toBe("04:00 PM");
  });

  it("returns an empty string for null input", () => {
    expect(formatTime(null)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("renders the default DATETIME_MEDIUM pattern in Asia/Kolkata", () => {
    expect(formatDateTime("2025-06-15T10:30:00Z")).toBe(
      "15 Jun 2025, 04:00 PM",
    );
  });

  it("honors a timezone override", () => {
    expect(
      formatDateTime("2025-06-15T10:30:00Z", undefined, {
        timezone: "America/New_York",
      }),
    ).toBe("15 Jun 2025, 06:30 AM");
  });

  it("returns an empty string for null input", () => {
    expect(formatDateTime(null)).toBe("");
  });
});

describe("formatDateRange", () => {
  it("joins both dates with DATE_SHORT in Asia/Kolkata", () => {
    expect(
      formatDateRange("2025-06-15T00:00:00Z", "2025-06-18T00:00:00Z"),
    ).toBe("15/06/2025 - 18/06/2025");
  });

  it("handles open-ended ranges", () => {
    expect(formatDateRange(null, "2025-06-18T00:00:00Z")).toBe(
      "Until 18/06/2025",
    );
    expect(formatDateRange("2025-06-15T00:00:00Z", null)).toBe(
      "From 15/06/2025",
    );
    expect(formatDateRange(null, null)).toBe("");
  });
});

describe("formatRelativeDate", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("labels the same IST calendar day as Today", () => {
    expect(formatRelativeDate("2025-07-01T10:00:00Z")).toBe("Today");
  });

  it("labels the previous IST calendar day as Yesterday", () => {
    expect(formatRelativeDate("2025-06-30T10:00:00Z")).toBe("Yesterday");
  });

  it("falls back to DATE_MEDIUM for older dates", () => {
    expect(formatRelativeDate("2025-06-15T10:00:00Z")).toBe("15 Jun 2025");
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

  it("renders a suffixed relative distance for Date and number inputs", () => {
    expect(formatDistanceToNow(new Date("2025-07-01T10:00:00Z"))).toBe(
      "about 2 hours ago",
    );
    expect(formatDistanceToNow(Date.now() - 3_600_000)).toBe("about 1 hour ago");
  });

  it("returns an empty string for null and undefined", () => {
    expect(formatDistanceToNow(null)).toBe("");
    expect(formatDistanceToNow(undefined)).toBe("");
  });
});

describe("picker helpers", () => {
  it("formats local calendar fields without timezone shifting", () => {
    expect(formatPickerIsoDate(new Date(2025, 5, 15))).toBe("2025-06-15");
    expect(formatPickerMonthShort(new Date(2025, 5, 15))).toBe("Jun");
  });
});
