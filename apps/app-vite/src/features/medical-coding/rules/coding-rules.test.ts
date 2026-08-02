import { describe, expect, it } from "vitest";
import {
  formatDiagnosisCode,
  getICD10Category,
  isValidCPTCode,
  isValidICD10Code,
  requiresMoreSpecificity,
} from "./coding-rules";

describe("Medical Coding Rules", () => {
  describe("isValidICD10Code", () => {
    it("should validate correct ICD-10 codes", () => {
      expect(isValidICD10Code("A00")).toBe(true);
      expect(isValidICD10Code("J01.90")).toBe(true);
      expect(isValidICD10Code("M54.5")).toBe(true);
    });

    it("should reject invalid ICD-10 codes", () => {
      expect(isValidICD10Code("123")).toBe(false);
      expect(isValidICD10Code("A1")).toBe(false);
      expect(isValidICD10Code("A00.")).toBe(false);
    });
  });

  describe("isValidCPTCode", () => {
    it("should validate correct CPT codes", () => {
      expect(isValidCPTCode("99213")).toBe(true);
      expect(isValidCPTCode("99213-25")).toBe(true);
    });

    it("should reject invalid CPT codes", () => {
      expect(isValidCPTCode("9921")).toBe(false);
      expect(isValidCPTCode("ABCDE")).toBe(false);
    });
  });

  describe("getICD10Category", () => {
    it("should return correct category from code", () => {
      expect(getICD10Category("A00")).toBe("Infectious Diseases");
      expect(getICD10Category("J01")).toBe("Respiratory System");
      expect(getICD10Category("M54")).toBe("Musculoskeletal");
    });

    it("should return Other for unknown prefixes", () => {
      expect(getICD10Category("?00")).toBe("Other");
    });
  });

  describe("formatDiagnosisCode", () => {
    it("should format code with dot", () => {
      expect(formatDiagnosisCode("J0190")).toBe("J01.90");
    });

    it("should keep already formatted code", () => {
      expect(formatDiagnosisCode("J01.90")).toBe("J01.90");
    });

    it("should uppercase code", () => {
      expect(formatDiagnosisCode("j01.90")).toBe("J01.90");
    });
  });

  describe("requiresMoreSpecificity", () => {
    it("should return true for base codes", () => {
      expect(requiresMoreSpecificity("M54")).toBe(true);
    });

    it("should return true for short sub-codes", () => {
      expect(requiresMoreSpecificity("M54.1")).toBe(true);
    });

    it("should return false for specific codes", () => {
      expect(requiresMoreSpecificity("M54.10")).toBe(false);
      expect(requiresMoreSpecificity("M54.100")).toBe(false);
    });
  });
});
