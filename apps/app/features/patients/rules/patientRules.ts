import type { Patient, User } from "@workspace/types";
import { differenceInYears } from "date-fns";

/**
 * Patient Business Rules
 * Pure functions for patient-related business logic
 */

/**
 * Check if patient is a minor (under 18)
 */
export const isPatientMinor = (patient: Patient): boolean => {
  if (!patient.dateOfBirth) return false;

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
  return age < 18;
};

/**
 * Check if patient requires guardian consent
 */
export const requiresGuardianConsent = (patient: Patient): boolean => {
  return isPatientMinor(patient);
};

/**
 * Check if user can delete a patient
 */
export const canDeletePatient = (patient: Patient, user: User): boolean => {
  // Only admins can delete patients
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return false;

  // Cannot delete patient with active appointments (if appointments exist)
  // This would need actual appointment data to check
  return true;
};

/**
 * Check if user can edit patient
 */
export const canEditPatient = (user: User): boolean => {
  return ["admin", "doctor", "receptionist"].includes(user.role);
};

/**
 * Check if user can view patient details
 */
export const canViewPatient = (user: User): boolean => {
  // All authenticated users can view patients
  return !!user;
};

/**
 * Get patient's display name
 */
export const getPatientDisplayName = (patient: Patient): string => {
  return `${patient.firstName} ${patient.lastName}`.trim();
};

/**
 * Get patient's age in years
 */
export const getPatientAge = (patient: Patient): number | null => {
  if (!patient.dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(patient.dateOfBirth));
};

/**
 * Get patient's age display string
 */
export const getPatientAgeDisplay = (patient: Patient): string => {
  const age = getPatientAge(patient);
  if (age === null) return "Age unknown";

  if (age === 0) {
    const months = Math.floor(
      (new Date().getTime() - new Date(patient.dateOfBirth!).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    );
    if (months === 0) return "Less than 1 month";
    return `${months} month${months > 1 ? "s" : ""}`;
  }

  return `${age} year${age > 1 ? "s" : ""}`;
};

/**
 * Validate patient data before submission
 */
export const validatePatientData = (data: Partial<Patient>): string[] => {
  const errors: string[] = [];

  if (!data.firstName?.trim()) {
    errors.push("First name is required");
  }

  if (!data.lastName?.trim()) {
    errors.push("Last name is required");
  }

  if (!data.phoneNumber?.trim()) {
    errors.push("Phone number is required");
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  return errors;
};
