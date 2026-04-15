import type { Patient, User } from "@workspace/types";
import { differenceInYears } from "date-fns";
import { CLINIC_ADMIN_ROLES } from "@/lib/permissions";

type PatientNameLike = {
  firstName?: string | null;
  lastName?: string | null;
};

type PatientDateLike = {
  dateOfBirth?: string | Date | null;
};

export const isPatientMinor = (patient: Patient): boolean => {
  if (!patient.dateOfBirth) return false;

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
  return age < 18;
};

export const requiresGuardianConsent = (patient: Patient): boolean => {
  return isPatientMinor(patient);
};

export const canDeletePatient = (_patient: Patient, user: User): boolean => {

  if (!CLINIC_ADMIN_ROLES.has(user.role as "ADMIN" | "ADMIN_DOCTOR"))
    return false;

  return true;
};

export const canEditPatient = (user: User): boolean => {
  return ["admin", "doctor", "receptionist"].includes(user.role);
};

export const canViewPatient = (user: User): boolean => {

  return !!user;
};

export const getPatientDisplayName = (patient: PatientNameLike): string => {
  return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
};

export const getPatientAge = (patient: PatientDateLike): number | null => {
  if (!patient.dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(patient.dateOfBirth));
};

export const getPatientAgeDisplay = (patient: PatientDateLike): string => {
  const age = getPatientAge(patient);
  if (age === null) return "Age unknown";

  if (age === 0) {
    if (!patient.dateOfBirth) return "Age unknown";
    const months = Math.floor(
      (new Date().getTime() - new Date(patient.dateOfBirth).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    );
    if (months === 0) return "Less than 1 month";
    return `${months} month${months > 1 ? "s" : ""}`;
  }

  return `${age} year${age > 1 ? "s" : ""}`;
};

export const getPatientDisplayLabel = (patient: PatientNameLike): string => {
  return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
};

export const validatePatientData = (data: Partial<Patient>): string[] => {
  const errors: string[] = [];

  if (!data.firstName?.trim()) {
    errors.push("Enter the patient's first name");
  }

  if (!data.lastName?.trim()) {
    errors.push("Enter the patient's last name");
  }

  if (!data.phoneNumber?.trim()) {
    errors.push("Enter the patient's phone number");
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Enter a valid email address");
  }

  return errors;
};
