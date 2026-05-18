import { describe, expect, it } from "vitest";
import {
  dateRules,
  formattingRules,
  medicalRules,
  permissionRules,
  validationRules,
} from "./index";

describe("Shared Business Rules", () => {
  describe("dateRules", () => {
    it("should validate future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateRules.isValidFutureDate(tomorrow)).toBe(true);
      expect(dateRules.isValidFutureDate(new Date("2020-01-01"))).toBe(false);
    });

    it("should validate business hours", () => {
      const businessHour = new Date();
      businessHour.setHours(10, 0, 0);
      expect(dateRules.isWithinBusinessHours(businessHour, 9, 18)).toBe(true);

      const afterHours = new Date();
      afterHours.setHours(20, 0, 0);
      expect(dateRules.isWithinBusinessHours(afterHours, 9, 18)).toBe(false);
    });
  });

  describe("validationRules", () => {
    it("should validate emails", () => {
      expect(validationRules.isValidEmail("test@example.com")).toBe(true);
      expect(validationRules.isValidEmail("invalid")).toBe(false);
    });

    it("should validate phone numbers", () => {
      expect(validationRules.isValidPhone("+1234567890")).toBe(true);
      expect(validationRules.isValidPhone("(123) 456-7890")).toBe(true);
      expect(validationRules.isValidPhone("123")).toBe(false);
    });
  });

  describe("permissionRules", () => {
    it("should check admin role", () => {
      expect(permissionRules.isAdmin("admin")).toBe(true);
      expect(permissionRules.isAdmin("doctor")).toBe(false);
    });

    it("should check patient data access", () => {
      expect(permissionRules.canViewPatientData("doctor")).toBe(true);
      expect(permissionRules.canViewPatientData("admin")).toBe(true);
      expect(permissionRules.canViewPatientData("nurse")).toBe(true);
      expect(permissionRules.canViewPatientData("receptionist")).toBe(false);
    });
  });

  describe("medicalRules", () => {
    it("should calculate age correctly", () => {
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(today.getFullYear() - 20);

      expect(medicalRules.calculateAge(birthDate)).toBe(20);

      const yesterdayBirth = new Date(birthDate);
      yesterdayBirth.setDate(birthDate.getDate() - 1);
      expect(medicalRules.calculateAge(yesterdayBirth)).toBe(20);

      const tomorrowBirth = new Date(birthDate);
      tomorrowBirth.setDate(birthDate.getDate() + 1);
      expect(medicalRules.calculateAge(tomorrowBirth)).toBe(19);
    });

    it("should identify minors", () => {
      expect(medicalRules.isMinor(15)).toBe(true);
      expect(medicalRules.isMinor(18)).toBe(false);
    });

    it("should calculate BMI", () => {
      const bmi = medicalRules.calculateBMI(70, 170);
      expect(bmi).toBeCloseTo(24.2, 1);
    });

    it("should categorize BMI", () => {
      expect(medicalRules.getBMICategory(17)).toBe("Underweight");
      expect(medicalRules.getBMICategory(22)).toBe("Normal");
      expect(medicalRules.getBMICategory(27)).toBe("Overweight");
      expect(medicalRules.getBMICategory(32)).toBe("Obese");
    });
  });

  describe("formattingRules", () => {
    it("should format currency", () => {
      const formatted = formattingRules.formatCurrency(1000);
      expect(formatted).toContain("1,000");
    });

    it("should format percentage", () => {
      expect(formattingRules.formatPercentage(15.5)).toBe("15.5%");
      expect(formattingRules.formatPercentage(100, 0)).toBe("100%");
    });

    it("should capitalize words", () => {
      expect(formattingRules.capitalizeWords("hello world")).toBe(
        "Hello World",
      );
    });
  });
});
