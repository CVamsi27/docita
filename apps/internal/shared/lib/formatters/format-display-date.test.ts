import { describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime } from "@workspace/utils";
import {
  formatInternalListDate,
  formatInternalTimestamp,
} from "./format-display-date";

vi.mock("@workspace/utils", () => ({
  formatDate: vi.fn(),
  formatDateTime: vi.fn(),
}));

describe("formatInternalListDate", () => {
  it("returns '-' for null input", () => {
    expect(formatInternalListDate(null)).toBe("-");
  });

  it("returns '-' for undefined input", () => {
    expect(formatInternalListDate(undefined)).toBe("-");
  });

  it("returns '-' for empty string input", () => {
    expect(formatInternalListDate("")).toBe("-");
  });

  it("returns '-' when formatted result is empty after trimming", () => {
    vi.mocked(formatDate).mockReturnValue("");
    expect(formatInternalListDate("2026-01-15")).toBe("-");
  });

  it("returns formatted date for valid input", () => {
    vi.mocked(formatDate).mockReturnValue("Jan 15, 2026");
    expect(formatInternalListDate("2026-01-15")).toBe("Jan 15, 2026");
  });
});

describe("formatInternalTimestamp", () => {
  it("returns '-' for null input", () => {
    expect(formatInternalTimestamp(null)).toBe("-");
  });

  it("returns '-' for undefined input", () => {
    expect(formatInternalTimestamp(undefined)).toBe("-");
  });

  it("returns formatted datetime for valid input", () => {
    vi.mocked(formatDateTime).mockReturnValue("Jan 15, 2026, 10:30 AM");
    expect(formatInternalTimestamp("2026-01-15T10:30:00Z")).toBe(
      "Jan 15, 2026, 10:30 AM",
    );
  });
});
