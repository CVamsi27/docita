import { describe, expect, it } from "vitest";
import {
  computeIpdStats,
  countBedsByStatus,
  countTotalBeds,
  type WardWithRooms,
} from "./ipd-stats-helpers";

function makeWard(
  id: string,
  rooms: { beds: { id: string; status: string }[] }[],
): WardWithRooms {
  return {
    id,
    name: "General",
    clinicId: "clinic-1",
    rooms: rooms.map((room, index) => ({
      id: `${id}-room-${index}`,
      name: `Room ${index + 1}`,
      wardId: id,
      beds: room.beds.map((bed, bedIndex) => ({
        id: bed.id,
        bedNumber: `B-${bedIndex + 1}`,
        status: bed.status as WardWithRooms["rooms"][number]["beds"][number]["status"],
        roomId: `${id}-room-${index}`,
        wardId: id,
        clinicId: "clinic-1",
      })),
    })),
  };
}

const wards = [
  makeWard("ward-a", [
    { beds: [{ id: "b1", status: "OCCUPIED" }, { id: "b2", status: "AVAILABLE" }] },
    { beds: [{ id: "b3", status: "MAINTENANCE" }, { id: "b4", status: "OCCUPIED" }] },
  ]),
  makeWard("ward-b", [
    { beds: [{ id: "b5", status: "AVAILABLE" }] },
  ]),
];

describe("countBedsByStatus", () => {
  it("counts beds matching the status case-insensitively", () => {
    expect(countBedsByStatus(wards, "OCCUPIED")).toBe(2);
    expect(countBedsByStatus(wards, "maintenance")).toBe(1);
    expect(countBedsByStatus(wards, "AVAILABLE")).toBe(2);
  });

  it("returns 0 for undefined wards", () => {
    expect(countBedsByStatus(undefined, "OCCUPIED")).toBe(0);
  });
});

describe("countTotalBeds", () => {
  it("counts every bed across all rooms and wards", () => {
    expect(countTotalBeds(wards)).toBe(5);
  });

  it("returns 0 for undefined wards", () => {
    expect(countTotalBeds(undefined)).toBe(0);
  });
});

describe("computeIpdStats", () => {
  it("computes totals, rates, and availability", () => {
    const stats = computeIpdStats(wards, 2);
    expect(stats.totalBeds).toBe(5);
    expect(stats.occupiedBeds).toBe(2);
    expect(stats.maintenanceBeds).toBe(1);
    expect(stats.availableBeds).toBe(3);
    expect(stats.occupancyRate).toBe(40);
    expect(stats.activeAdmissions).toBe(2);
  });

  it("keeps an explicit zero admissions list as zero (?? semantics)", () => {
    const stats = computeIpdStats(wards, 0);
    expect(stats.activeAdmissions).toBe(0);
  });

  it("approximates with occupied beds when admissions data is unavailable", () => {
    const stats = computeIpdStats(wards, undefined);
    expect(stats.activeAdmissions).toBe(2);
  });

  it("falls back to zero values for undefined wards", () => {
    const stats = computeIpdStats(undefined, undefined);
    expect(stats).toEqual({
      totalBeds: 0,
      occupiedBeds: 0,
      availableBeds: 0,
      maintenanceBeds: 0,
      occupancyRate: 0,
      activeAdmissions: 0,
    });
  });
});
