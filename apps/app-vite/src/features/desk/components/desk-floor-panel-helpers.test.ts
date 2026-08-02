import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueueItem } from "@workspace/data-access";
import type { DeskFloorRow } from "./DeskFloorPanelUISections";
import { patientNameOf, toRow, tokenSort, recentSort } from "./desk-floor-panel-helpers";

vi.mock("@/features/consultation/lib/opd-queue-display", () => ({
  getOpdQueueSummaryLine: vi.fn(),
}));

import { getOpdQueueSummaryLine } from "@/features/consultation/lib/opd-queue-display";
const mockGetOpdQueueSummaryLine = vi.mocked(getOpdQueueSummaryLine);

// ---------------------------------------------------------------------------
// Typed fixture factories — replace `as any` casts with proper defaults
// ---------------------------------------------------------------------------

const QUEUE_ITEM_DEFAULTS: QueueItem = {
  id: "tok_default",
  clinicId: "clinic_1",
  patientId: "pat_1",
  tokenNumber: 1,
  status: "waiting",
  priority: 1,
  createdAt: "2026-07-25T08:00:00Z",
  tokenType: "scheduled",
  estimatedDuration: 15,
};

function buildQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return { ...QUEUE_ITEM_DEFAULTS, ...overrides };
}

function buildPatient(
  overrides: Partial<NonNullable<QueueItem["patient"]>> = {},
): NonNullable<QueueItem["patient"]> {
  return {
    id: "pat_1",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "+919876543210",
    ...overrides,
  };
}

function buildDoctor(
  overrides: Partial<NonNullable<QueueItem["doctor"]>> = {},
): NonNullable<QueueItem["doctor"]> {
  return { id: "doc_1", name: "Dr. Rao", ...overrides };
}

function buildAppointmentDoctor(
  overrides: Partial<{ id: string; name: string }> = {},
) {
  return { id: "doc_2", name: "Dr. Patel", ...overrides };
}

// ---------------------------------------------------------------------------
// patientNameOf
// ---------------------------------------------------------------------------

describe("patientNameOf", () => {
  it("returns first and last name combined", () => {
    const item = buildQueueItem({
      patient: buildPatient({ firstName: "John", lastName: "Doe" }),
    });
    expect(patientNameOf(item)).toBe("John Doe");
  });

  it("returns only first name when last name is empty", () => {
    const item = buildQueueItem({
      patient: buildPatient({ firstName: "John", lastName: "" }),
    });
    expect(patientNameOf(item)).toBe("John");
  });

  it("returns only last name when first name is empty", () => {
    const item = buildQueueItem({
      patient: buildPatient({ firstName: "", lastName: "Doe" }),
    });
    expect(patientNameOf(item)).toBe("Doe");
  });

  it("returns Unknown patient when both names are missing", () => {
    const item = buildQueueItem({
      patient: buildPatient({ firstName: "", lastName: "" }),
    });
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is undefined", () => {
    const item = buildQueueItem({ patient: undefined });
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is null", () => {
    const item = buildQueueItem({ patient: null });
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("trims whitespace from names", () => {
    const item = buildQueueItem({
      patient: buildPatient({ firstName: "  John  ", lastName: "  Doe  " }),
    });
    expect(patientNameOf(item)).toBe("John Doe");
  });
});

// ---------------------------------------------------------------------------
// tokenSort
// ---------------------------------------------------------------------------

describe("tokenSort", () => {
  it("sorts by token number ascending", () => {
    const a: DeskFloorRow = { id: "1", tokenNumber: 1, patientName: "A", isWalkIn: false };
    const b: DeskFloorRow = { id: "2", tokenNumber: 2, patientName: "B", isWalkIn: false };
    expect(tokenSort(a, b)).toBe(-1);
    expect(tokenSort(b, a)).toBe(1);
  });

  it("returns 0 for equal token numbers", () => {
    const a: DeskFloorRow = { id: "1", tokenNumber: 5, patientName: "A", isWalkIn: false };
    const b: DeskFloorRow = { id: "2", tokenNumber: 5, patientName: "B", isWalkIn: false };
    expect(tokenSort(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// recentSort
// ---------------------------------------------------------------------------

describe("recentSort", () => {
  it("sorts by completedAt descending (most recent first)", () => {
    const a = buildQueueItem({ completedAt: "2026-07-25T10:00:00Z" });
    const b = buildQueueItem({ completedAt: "2026-07-25T11:00:00Z" });
    expect(recentSort(a, b)).toBeGreaterThan(0);
    expect(recentSort(b, a)).toBeLessThan(0);
  });

  it("treats missing completedAt as 0", () => {
    const a = buildQueueItem({ completedAt: null });
    const b = buildQueueItem({ completedAt: "2026-07-25T10:00:00Z" });
    expect(recentSort(a, b)).toBeGreaterThan(0);
  });

  it("returns 0 for equal completedAt", () => {
    const ts = "2026-07-25T10:00:00Z";
    const a = buildQueueItem({ completedAt: ts });
    const b = buildQueueItem({ completedAt: ts });
    expect(recentSort(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// toRow
// ---------------------------------------------------------------------------

describe("toRow", () => {
  beforeEach(() => {
    mockGetOpdQueueSummaryLine.mockReset();
  });

  it("maps a QueueItem to a DeskFloorRow", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("Fever, cough");
    const item = buildQueueItem({
      id: "tok_1",
      tokenNumber: 3,
      patient: buildPatient({ firstName: "Jane", lastName: "Smith" }),
      doctor: buildDoctor({ name: "Dr. Rao" }),
      scheduledTime: "2026-07-25T09:30:00Z",
    });

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
    const item = buildQueueItem({
      id: "tok_2",
      patient: buildPatient({ firstName: "A", lastName: "B" }),
      doctor: null,
      appointment: {
        id: "apt_1",
        doctor: buildAppointmentDoctor({ name: "Dr. Patel" }),
      },
    });

    const row = toRow(item);
    expect(row.doctorName).toBe("Dr. Patel");
  });

  it("returns null doctorName when both doctor and appointment doctor are absent", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = buildQueueItem({
      id: "tok_3",
      patient: buildPatient({ firstName: "A", lastName: "B" }),
    });

    const row = toRow(item);
    expect(row.doctorName).toBeNull();
  });

  it("marks walk-in tokens as isWalkIn", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = buildQueueItem({
      id: "tok_4",
      patient: buildPatient({ firstName: "X", lastName: "Y" }),
      tokenType: "walk-in",
    });

    expect(toRow(item).isWalkIn).toBe(true);
  });

  it("marks late-arrival tokens as isWalkIn", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = buildQueueItem({
      id: "tok_5",
      patient: buildPatient({ firstName: "X", lastName: "Y" }),
      tokenType: "late-arrival",
    });

    expect(toRow(item).isWalkIn).toBe(true);
  });

  it("returns null scheduledTime when absent", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = buildQueueItem({
      id: "tok_6",
      patient: buildPatient({ firstName: "X", lastName: "Y" }),
    });

    expect(toRow(item).scheduledTime).toBeNull();
  });

  it("uses Unknown patient fallback when patient names are empty", () => {
    mockGetOpdQueueSummaryLine.mockReturnValue("");
    const item = buildQueueItem({
      id: "tok_7",
      patient: buildPatient({ firstName: "", lastName: "" }),
    });

    expect(toRow(item).patientName).toBe("Unknown patient");
  });
});
