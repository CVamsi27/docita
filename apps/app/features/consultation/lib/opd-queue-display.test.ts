import { describe, expect, it } from "vitest";
import type { QueueItem } from "@/hooks/api/use-appointments";
import {
  getOpdQueueSummaryLine,
  truncateOpdSummary,
} from "./opd-queue-display";

function baseItem(over: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "q1",
    clinicId: "c1",
    patientId: "p1",
    tokenNumber: 7,
    status: "WAITING",
    priority: 0,
    createdAt: new Date().toISOString(),
    tokenType: "walk-in",
    estimatedDuration: 15,
    estimatedWaitTime: 10,
    ...over,
  };
}

describe("getOpdQueueSummaryLine", () => {
  it("prefers chief complaint when present", () => {
    const item = baseItem({
      appointment: {
        id: "a1",
        doctor: { id: "d1", name: "Dr" },
        chiefComplaint: "Fever for 3 days",
        type: "follow-up",
      },
    });
    expect(getOpdQueueSummaryLine(item)).toContain("Fever");
  });

  it("falls back to appointment type", () => {
    const item = baseItem({
      appointment: {
        id: "a1",
        doctor: { id: "d1", name: "Dr" },
        type: "follow-up",
      },
    });
    expect(getOpdQueueSummaryLine(item).toLowerCase()).toContain("follow");
  });

  it("falls back to token type label", () => {
    const item = baseItem();
    expect(getOpdQueueSummaryLine(item).length).toBeGreaterThan(0);
  });
});

describe("truncateOpdSummary", () => {
  it("truncates long strings", () => {
    const s = "x".repeat(200);
    expect(truncateOpdSummary(s, 50).length).toBeLessThanOrEqual(50);
  });
});
