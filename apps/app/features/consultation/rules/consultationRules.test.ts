import { describe, expect, it } from "vitest";
import {
  canCompleteConsultation,
  getVitalRanges,
  isVitalNormal,
  requiresUrgentAttention,
} from "./consultationRules";
import type { Appointment, VitalSign } from "@workspace/types";

describe("Consultation Business Rules", () => {
  describe("getVitalRanges", () => {
    it("should return infant ranges", () => {
      const ranges = getVitalRanges(0.5);
      expect(ranges.heartRate.min).toBe(120);
    });

    it("should return child ranges", () => {
      const ranges = getVitalRanges(5);
      expect(ranges.heartRate.min).toBe(70);
    });

    it("should return adult ranges", () => {
      const ranges = getVitalRanges(25);
      expect(ranges.heartRate.min).toBe(60);
    });
  });

  describe("isVitalNormal", () => {
    it("should use correct age-based ranges", () => {
      // Adult heart rate 80 is normal
      expect(isVitalNormal("heartRate", 80, 30)).toBe(true);
      // Infant heart rate 80 is LOW (min 120)
      expect(isVitalNormal("heartRate", 80, 0.5)).toBe(false);
    });

    it("should return true for unknown vitals", () => {
      expect(isVitalNormal("unknownParam", 100, 30)).toBe(true);
    });
  });

  describe("requiresUrgentAttention", () => {
    it("should return false for normal vitals", () => {
      const vitals: VitalSign = {
        bloodPressure: "120/80",
        spo2: 98,
        temperature: 98.6,
      } as VitalSign;
      expect(requiresUrgentAttention(vitals)).toBe(false);
    });

    it("should return true for high BP", () => {
      expect(
        requiresUrgentAttention({ bloodPressure: "190/100" } as VitalSign),
      ).toBe(true);
      expect(
        requiresUrgentAttention({ bloodPressure: "120/130" } as VitalSign),
      ).toBe(true);
    });

    it("should return true for low SpO2", () => {
      expect(requiresUrgentAttention({ spo2: 88 } as VitalSign)).toBe(true);
    });

    it("should return true for high fever", () => {
      expect(requiresUrgentAttention({ temperature: 104 } as VitalSign)).toBe(
        true,
      );
    });
  });

  describe("canCompleteConsultation", () => {
    it("should require chief complaint, diagnosis, and vitals", () => {
      const complete = {
        chiefComplaint: "Pain",
        diagnoses: [{ code: "A00", description: "Test" }],
        vitalSign: {},
      } as unknown as Appointment;
      expect(canCompleteConsultation(complete)).toBe(true);
    });

    it("should return false if missing required fields", () => {
      expect(
        canCompleteConsultation({
          chiefComplaint: "Pain",
        } as unknown as Appointment),
      ).toBe(false);
    });
  });
});
