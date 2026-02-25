import { describe, expect, it } from "vitest";
import {
  checkAllergyContraindications,
  checkConditionContraindications,
  checkDrugDrugContraindications,
  checkMedicationContraindications,
} from "./medical/contraindication-checker.js";
import type { Allergy, PatientCondition } from "@workspace/types";

describe("Contraindication Checker", () => {
  describe("checkConditionContraindications", () => {
    it("should detect absolute contraindications", () => {
      const conditions = [
        { name: "severe heart failure" },
      ] as PatientCondition[];
      const result = checkConditionContraindications("ibuprofen", conditions);

      expect(result).not.toBeNull();
      expect(result?.isContraindicated).toBe(true);
      expect(result?.severity).toBe("critical");
    });

    it("should detect relative contraindications", () => {
      const conditions = [{ name: "asthma" }] as PatientCondition[];
      const result = checkConditionContraindications("ibuprofen", conditions);

      expect(result).not.toBeNull();
      expect(result?.isContraindicated).toBe(false);
      expect(result?.severity).toBe("warning");
    });

    it("should return null if no contraindications", () => {
      const conditions = [{ name: "healthy" }] as PatientCondition[];
      expect(
        checkConditionContraindications("ibuprofen", conditions),
      ).toBeNull();
    });
  });

  describe("checkAllergyContraindications", () => {
    it("should detect direct allergy", () => {
      const allergies = [
        { name: "Amoxicillin", severity: "severe" },
      ] as Allergy[];
      const result = checkAllergyContraindications("Amoxicillin", allergies);

      expect(result).not.toBeNull();
      expect(result?.isContraindicated).toBe(true);
      expect(result?.reason).toBe("allergy");
    });

    it("should detect cross-reactivity (Penicillin group)", () => {
      // Patient allergic to Penicillin V
      const allergies = [
        { name: "Penicillin V", severity: "mild" },
      ] as Allergy[];
      // Prescribing Amoxicillin (same group)
      const result = checkAllergyContraindications("Amoxicillin", allergies);

      expect(result).not.toBeNull();
      expect(result?.isContraindicated).toBe(true); // Cross-reactivity is usually treated as critical in this logic
      expect(result?.message).toContain("penicillins");
    });
  });

  describe("checkDrugDrugContraindications", () => {
    it("should detect major interactions", () => {
      const currentMeds = ["Warfarin"];
      const result = checkDrugDrugContraindications("Aspirin", currentMeds);

      expect(result).not.toBeNull();
      expect(result?.isContraindicated).toBe(true);
      expect(result?.reason).toBe("interaction");
    });

    it("should return null for safe combinations", () => {
      const currentMeds = ["Vitamin C"];
      expect(checkDrugDrugContraindications("Aspirin", currentMeds)).toBeNull();
    });
  });

  describe("checkMedicationContraindications", () => {
    it("should aggregate all checks", () => {
      const patientData = {
        conditions: [{ name: "active peptic ulcer" }] as PatientCondition[],
        allergies: [{ name: "Aspirin", severity: "severe" }] as Allergy[],
        currentMedications: ["Warfarin"],
        isPregnant: true,
      };

      // Ibuprofen checks:
      // 1. Condition: Peptic ulcer (Absolute)
      // 2. Allergy: NSAID group (Aspirin is NSAID/Salicylate, Ibuprofen is NSAID - logic might link them via group if defined)
      // 3. Pregnancy: Contraindicated

      const results = checkMedicationContraindications(
        "ibuprofen",
        patientData,
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: ContraindicationCheck) => r.reason === "condition")).toBe(true);
      expect(results.some((r: ContraindicationCheck) => r.reason === "pregnancy")).toBe(true);
    });
  });
});
