import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidPhoneNumber,
  validateClinicHours,
} from "./settingsRules";

describe("Settings Rules", () => {
  describe("validateClinicHours", () => {
    it("should validate correct hours", () => {
      expect(validateClinicHours(9, 17)).toBe(true);
    });

    it("should reject if opening > closing", () => {
      expect(validateClinicHours(18, 9)).toBe(false);
    });

    it("should reject invalid hours", () => {
      expect(validateClinicHours(-1, 10)).toBe(false);
      expect(validateClinicHours(9, 25)).toBe(false);
    });
  });

  describe("isValidPhoneNumber", () => {
    it("should validate correct phone numbers", () => {
      expect(isValidPhoneNumber("+1234567890")).toBe(true);
      expect(isValidPhoneNumber("1234567890")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(isValidPhoneNumber("123")).toBe(false); 
      expect(isValidPhoneNumber("abc")).toBe(false); 
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("test.com")).toBe(false);
    });
  });
});
