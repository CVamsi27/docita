import { describe, expect, it } from "vitest";
import {
  getPatientAgeDisplay,
  isPatientMinor,
  validatePatientPhoneNumberForCountry,
  validatePatientData,
} from "./patientRules";
import type { Patient } from "@workspace/types";

describe("Patient Business Rules", () => {
  describe("isPatientMinor", () => {
    it("should identify minors correctly", () => {
      const today = new Date();
      const minorDate = new Date(today);
      minorDate.setFullYear(today.getFullYear() - 17);

      const patient = { dateOfBirth: minorDate.toISOString() } as Patient;
      expect(isPatientMinor(patient)).toBe(true);
    });

    it("should identify adults correctly", () => {
      const today = new Date();
      const adultDate = new Date(today);
      adultDate.setFullYear(today.getFullYear() - 18);

      const patient = { dateOfBirth: adultDate.toISOString() } as Patient;
      expect(isPatientMinor(patient)).toBe(false);
    });

    it("should return false if DOB is missing", () => {
      const patient = {} as Patient;
      expect(isPatientMinor(patient)).toBe(false);
    });
  });

  describe("getPatientAgeDisplay", () => {
    it("should display years for adults", () => {
      const today = new Date();
      const date = new Date(today);
      date.setFullYear(today.getFullYear() - 30);

      const patient = { dateOfBirth: date.toISOString() } as Patient;
      expect(getPatientAgeDisplay(patient)).toBe("30 years");
    });

    it("should display months for infants < 1 year", () => {
      const today = new Date();
      const date = new Date(today);
      date.setMonth(today.getMonth() - 6);

      const patient = { dateOfBirth: date.toISOString() } as Patient;
      expect(getPatientAgeDisplay(patient)).toBe("6 months");
    });

    it("should display 'Less than 1 month' for newborns", () => {
      const today = new Date();
      const date = new Date(today);
      date.setDate(today.getDate() - 5);

      const patient = { dateOfBirth: date.toISOString() } as Patient;
      expect(getPatientAgeDisplay(patient)).toBe("Less than 1 month");
    });

    it("should handle missing DOB", () => {
      const patient = {} as Patient;
      expect(getPatientAgeDisplay(patient)).toBe("Age unknown");
    });
  });

  describe("validatePatientData", () => {
    it("should require firstName", () => {
      const errors = validatePatientData({
        lastName: "Doe",
        phoneNumber: "123",
      });
      expect(errors).toContain("Enter the patient's first name");
    });

    it("should require lastName", () => {
      const errors = validatePatientData({
        firstName: "John",
        phoneNumber: "123",
      });
      expect(errors).toContain("Enter the patient's last name");
    });

    it("should require phoneNumber", () => {
      const errors = validatePatientData({
        firstName: "John",
        lastName: "Doe",
      });
      expect(errors).toContain("Enter the patient's phone number");
    });

    it("should validate email format", () => {
      const errors = validatePatientData({
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "123",
        email: "invalid-email",
      });
      expect(errors).toContain("Enter a valid email address");
    });

    it("should pass valid data", () => {
      const errors = validatePatientData({
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+919876543210",
        email: "test@example.com",
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe("validatePatientPhoneNumberForCountry", () => {
    it("should accept a valid number for the clinic country", () => {
      expect(
        validatePatientPhoneNumberForCountry("+919876543210", "IN"),
      ).toBeNull();
    });

    it("should reject a number that does not match the clinic country", () => {
      expect(
        validatePatientPhoneNumberForCountry("+14155552671", "IN"),
      ).toBe("Enter a valid phone number for the selected clinic country");
    });

    it("should fall back to the default clinic country when missing", () => {
      expect(
        validatePatientPhoneNumberForCountry("+919876543210", undefined),
      ).toBeNull();
    });
  });
});
