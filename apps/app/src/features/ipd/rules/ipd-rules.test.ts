import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Admission,
  type Bed,
  calculateLengthOfStay,
  canAdmitPatient,
  canDischargePatient,
  getAvailableBeds,
  getBedOccupancyRate,
} from "./ipd-rules";

describe("IPD Rules", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canAdmitPatient", () => {
    it("should allow admission to available bed", () => {
      const bed = { status: "available" } as Bed;
      expect(canAdmitPatient(bed)).toBe(true);
    });

    it("should not allow admission to occupied bed", () => {
      const bed = { status: "occupied" } as Bed;
      expect(canAdmitPatient(bed)).toBe(false);
    });
  });

  describe("canDischargePatient", () => {
    it("should allow discharge of admitted patient", () => {
      const admission = { status: "admitted" } as Admission;
      expect(canDischargePatient(admission)).toBe(true);
    });

    it("should not allow discharge if already discharged", () => {
      const admission = { status: "discharged" } as Admission;
      expect(canDischargePatient(admission)).toBe(false);
    });
  });

  describe("calculateLengthOfStay", () => {
    it("should calculate days between dates", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-05");
      expect(calculateLengthOfStay(start, end)).toBe(4);
    });

    it("should default end date to now if missing", () => {
      const now = new Date("2026-04-09T06:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const start = new Date("2026-04-07T06:00:00.000Z");
      expect(calculateLengthOfStay(start)).toBe(2);
    });
  });

  describe("getBedOccupancyRate", () => {
    it("should calculate correct percentage", () => {
      const beds = [
        { status: "occupied" },
        { status: "available" },
        { status: "occupied" },
        { status: "available" },
      ] as Bed[];
      expect(getBedOccupancyRate(beds)).toBe(50);
    });

    it("should handle empty bed list", () => {
      expect(getBedOccupancyRate([])).toBe(0);
    });
  });

  describe("getAvailableBeds", () => {
    it("should return only available beds", () => {
      const beds = [
        { id: "1", status: "occupied" },
        { id: "2", status: "available" },
      ] as Bed[];
      const available = getAvailableBeds(beds);
      expect(available.length).toBe(1);
      expect(available[0].id).toBe("2");
    });

    it("should filter by wardId if provided", () => {
      const beds = [
        { id: "1", status: "available", wardId: "A" },
        { id: "2", status: "available", wardId: "B" },
      ] as Bed[];
      const available = getAvailableBeds(beds, "A");
      expect(available.length).toBe(1);
      expect(available[0].id).toBe("1");
    });
  });
});
