import { describe, it, expect, vi, beforeEach } from "vitest";
import { patientNameOf, toRow, tokenSort, recentSort } from "./desk-floor-panel-helpers";

vi.mock("@/features/consultation", () => ({
  getOpdQueueSummaryLine: vi.fn(),
}));

import { getOpdQueueSummaryLine } from "@/features/consultation";
const mockGetOpdQueueSummaryLine = vi.mocked(getOpdQueueSummaryLine);

describe("patientNameOf", () => {
  it("returns first and last name combined", () => {
    const item = {
      patient: { firstName: "John", lastName: "Doe" },
    } as any;
    expect(patientNameOf(item)).toBe("John Doe");
  });

  it("returns only first name when last name is empty", () => {
    const item = {
      patient: { firstName: "John", lastName: "" },
    } as any;
    expect(patientNameOf(item)).toBe("John");
  });

  it("returns only last name when first name is empty", () => {
    const item = {
      patient: { firstName: "", lastName: "Doe" },
    } as any;
    expect(patientNameOf(item)).toBe("Doe");
  });

  it("returns Unknown patient when both names are missing", () => {
    const item = {
      patient: { firstName: "", lastName: "" },
    } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is undefined", () => {
    const item = { patient: undefined } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is null", () => {
    const item = { patient: null } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("trims whitespace from names", () => {
    const item = {
      patient: { firstName: "  John  ", lastName: "  Doe  " },
    } as any;
    expect(patientNameOf(item)).toBe("John Doe");
  });
});

describe("tokenSort", () => {
  it("sorts by token number ascending", () => {
    const a = { tokenNumber: 1 } as any;
    const b = { tokenNumber: 2 } as any;
    expect(tokenSort(a, b)).toBe(-1);
    expect(tokenSort(b, a)).toBe(1);
  });

  it("returns 0 for equal token numbers", () => {
    const a = { tokenNumber: 5 } as any;
    const b = { tokenNumber: 5 } as any;
    expect(tokenSort(a, b)).toBe(0);
  });
});

describe("recentSort", () => {
  it("sorts by completedAt descending (most recent first)", () => {
    const a = { completedAt: "2026-07-25T10:00:00Z" } as any;
    const b = { completedAt: "2026-07-25T11:00:00Z" } as any;
    expect(recentSort(a, b)).toBeGreaterThan(0);
    expect(recentSort(b, a)).toBeLessThan(0);
  });

  it("treats missing completedAt as 0", () => {
    const a = { completedAt: null } as any;
    const b = { completedAt: "2026-07-25T10:00:00Z" } as any;
    expect(recentSort(a, b)).toBeGreaterThan(0);
  });

  it("returns 0 for equal completedAt", () => {
    const ts = "2026-07-25T10:00:00Z";
    const a = { completedAt: ts } as any;
    const b = { completedAt: ts } as any;
    expect(recentSort(a, b)).toBe(0);
  });
});

describe("toRow", () => {
  beforeEach(() => {
    mockGetOpdQueueSummaryLine.mockReset();
  });

  it("maps a QueueItem to a DeskFloorRow", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("Fever, cough");
    const item = {
      id: "tok_1",
      tokenNumber: 3,
      patient: { firstName: "Jane", lastName: "Smith" },
      doctor: { name: "Dr. Rao" },
      scheduledTime: "2026-07-25T09:30:00Z",
      tokenType: "scheduled",
    } as any;

    const row = toRow(item);

    expect(row).toEqual({
      id: "tok_1",
      tokenNumber: 3,
      patientName: "Jane Smith",
      scheduledTime: "2026-07-25T09:30:00Z",
      doctorName: "Dr. Rao",
      visitSummary: "Fever, cough",
      isWalkIn: false,
    });
    expect(mockGetOpdQueueSummaryLine).toHaveBeenCalledWith(item);
  });

  it("falls back to appointment doctor name when doctor is absent", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_2",
      tokenNumber: 1,
      patient: { firstName: "A", lastName: "B" },
      doctor: null,
      appointment: { doctor: { name: "Dr. Patel" } },
      tokenType: "scheduled",
    } as any;

    const row = toRow(item);
    expect(row.doctorName).toBe("Dr. Patel");
  });

  it("returns null doctorName when both doctor and appointment doctor are absent", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_3",
      tokenNumber: 1,
      patient: { firstName: "A", lastName: "B" },
      tokenType: "scheduled",
    } as any;

    const row = toRow(item);
    expect(row.doctorName).toBeNull();
  });

  it("marks walk-in tokens as isWalkIn", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_4",
      tokenNumber: 1,
      patient: { firstName: "X", lastName: "Y" },
      tokenType: "walk-in",
    } as any;

    expect(toRow(item).isWalkIn).toBe(true);
  });

  it("marks late-arrival tokens as isWalkIn", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_5",
      tokenNumber: 1,
      patient: { firstName: "X", lastName: "Y" },
      tokenType: "late-arrival",
    } as any;

    expect(toRow(item).isWalkIn).toBe(true);
  });

  it("returns null scheduledTime when absent", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_6",
      tokenNumber: 1,
      patient: { firstName: "X", lastName: "Y" },
      tokenType: "scheduled",
    } as any;

    expect(toRow(item).scheduledTime).toBeNull();
  });

  it("uses Unknown patient fallback when patient names are empty", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = {
      id: "tok_7",
      tokenNumber: 1,
      patient: { firstName: "", lastName: "" },
      tokenType: "scheduled",
    } as any;

    expect(toRow(item).patientName).toBe("Unknown patient");
  });
});
