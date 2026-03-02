import type { Patient } from "@workspace/types";

export interface PatientWithHistory extends Omit<Patient, "medicalHistory"> {
  medicalHistory?: MedicalHistoryItem[];
}

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

export interface PatientFilters {
  search?: string;
  gender?: string;
  ageRange?: {
    min: number;
    max: number;
  };
  bloodGroup?: string;
}

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
