import type { Patient } from "@workspace/types";

/**
 * Patient-specific types
 * Types that are local to the patient feature and not shared globally
 */

/**
 * Patient with medical history included
 */
export interface PatientWithHistory extends Omit<Patient, "medicalHistory"> {
  medicalHistory?: MedicalHistoryItem[];
}

/**
 * Medical history timeline item
 */
export interface MedicalHistoryItem {
  id: string;
  date: string;
  type: string;
  description: string;
  doctor?: {
    id: string;
    name: string;
  };
}

/**
 * Patient list filters
 */
export interface PatientFilters {
  search?: string;
  gender?: string;
  ageRange?: {
    min: number;
    max: number;
  };
  bloodGroup?: string;
}

/**
 * Patient form data
 */
export interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}
