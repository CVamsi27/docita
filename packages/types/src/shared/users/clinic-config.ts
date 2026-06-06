import { z } from "zod";
import type { ClinicType } from "./roles";
import type { HospitalRole, Specialization } from "./roles";
import { clinicTypeSchema } from "./roles";

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  GENERAL: "General Clinic", DENTAL: "Dental Clinic", PEDIATRIC: "Pediatric Clinic",
  ORTHOPEDIC: "Orthopedic Clinic", CARDIOLOGY: "Cardiology Clinic", DERMATOLOGY: "Dermatology Clinic",
  ENT: "ENT Clinic", GYNECOLOGY: "Gynecology Clinic", OPHTHALMOLOGY: "Ophthalmology Clinic",
  PSYCHIATRY: "Psychiatry Clinic", SPECIALTY: "Others",
};

export const CLINIC_TYPE_OPTIONS = clinicTypeSchema.options.map((value) => ({ value, label: CLINIC_TYPE_LABELS[value] }));

export interface ClinicTypeFeatures {
  chiefComplaint: boolean;
  history: boolean;
  examination: boolean;
  vitals: boolean;
  diagnosis: boolean;
  treatment: boolean;
  investigations: boolean;
  prescriptions: boolean;
  procedures: boolean;
  followUp: boolean;
  dentalChart?: boolean;
  growthChart?: boolean;
  ophthalmologyExam?: boolean;
  cardiologyExam?: boolean;
  gynecologyExam?: boolean;
  dermatologyExam?: boolean;
  mentalStatusExam?: boolean;
  psychiatryExam?: boolean;
  visionTest?: boolean;
  ecgMonitoring?: boolean;
  imagingReview?: boolean;
  skinLesionTracking?: boolean;
  prenatalCare?: boolean;
  requiresSpecialtyNotes?: boolean;
  allowsMinorProcedures?: boolean;
  multiVisitTracking?: boolean;
  description?: string;
  recommendedDuration?: number;
}

export const CLINIC_TYPE_FEATURES: Record<ClinicType, ClinicTypeFeatures> = {
  GENERAL: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, requiresSpecialtyNotes: false, allowsMinorProcedures: true, multiVisitTracking: true, description: "Full-featured general practice with all consultation features enabled. Suitable for family medicine, internal medicine, and general practitioners.", recommendedDuration: 15 },
  DENTAL: { chiefComplaint: true, history: false, examination: false, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, dentalChart: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Streamlined dental workflow with tooth charting. Optimized for oral health, dental procedures, and treatment planning.", recommendedDuration: 30 },
  PEDIATRIC: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, growthChart: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Pediatric care with growth tracking and developmental milestones. Includes immunization management and age-appropriate dosing.", recommendedDuration: 20 },
  ORTHOPEDIC: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, imagingReview: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Orthopedic care with imaging review capabilities. Optimized for musculoskeletal conditions, fractures, and joint disorders.", recommendedDuration: 20 },
  CARDIOLOGY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, ecgMonitoring: true, cardiologyExam: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Cardiology practice with ECG monitoring and cardiac vital tracking. Designed for heart disease management and cardiac procedures.", recommendedDuration: 30 },
  DERMATOLOGY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, dermatologyExam: true, skinLesionTracking: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Dermatology clinic with photo documentation for skin lesions. Optimized for skin conditions and cosmetic procedures.", recommendedDuration: 15 },
  ENT: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, imagingReview: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "ENT specialist practice with imaging review. Designed for ear, nose, throat conditions and related procedures.", recommendedDuration: 20 },
  GYNECOLOGY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, gynecologyExam: true, prenatalCare: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Gynecology and obstetrics practice with prenatal care tracking. Optimized for women's health and pregnancy management.", recommendedDuration: 20 },
  OPHTHALMOLOGY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, visionTest: true, ophthalmologyExam: true, requiresSpecialtyNotes: true, allowsMinorProcedures: true, multiVisitTracking: true, description: "Eye care center with vision testing and ocular imaging. Designed for comprehensive eye examinations and treatments.", recommendedDuration: 25 },
  PSYCHIATRY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: false, followUp: true, mentalStatusExam: true, psychiatryExam: true, requiresSpecialtyNotes: true, allowsMinorProcedures: false, multiVisitTracking: true, description: "Mental health clinic with mental status examination tools. Optimized for psychiatric consultations and therapy tracking.", recommendedDuration: 45 },
  SPECIALTY: { chiefComplaint: true, history: true, examination: true, vitals: true, diagnosis: true, treatment: true, investigations: true, prescriptions: true, procedures: true, followUp: true, requiresSpecialtyNotes: false, allowsMinorProcedures: true, multiVisitTracking: true, description: "Flexible specialty clinic configuration with all features enabled. Suitable for any medical specialty not covered by specific types.", recommendedDuration: 20 },
};

export const ACTIVE_SPECIALIZATIONS = ["DENTAL", "OTHER", "CARDIOLOGY", "ENT", "OPHTHALMOLOGY", "DERMATOLOGY", "GYNECOLOGY", "PSYCHIATRY", "GENERAL_PRACTICE", "PEDIATRICS"] as const satisfies readonly Specialization[];

export const activeSpecializationSchema = z.enum(ACTIVE_SPECIALIZATIONS);
export type ActiveSpecialization = z.infer<typeof activeSpecializationSchema>;

export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  GENERAL_PRACTICE: "General Practice", DENTAL: "Dental / Dentistry", CARDIOLOGY: "Cardiology",
  PEDIATRICS: "Pediatrics", OPHTHALMOLOGY: "Ophthalmology", DERMATOLOGY: "Dermatology",
  ORTHOPEDICS: "Orthopedics", NEUROLOGY: "Neurology", GYNECOLOGY: "Gynecology & Obstetrics",
  ENT: "ENT (Ear, Nose, Throat)", PSYCHIATRY: "Psychiatry", UROLOGY: "Urology",
  PULMONOLOGY: "Pulmonology", GASTROENTEROLOGY: "Gastroenterology", ONCOLOGY: "Oncology",
  NEPHROLOGY: "Nephrology", ENDOCRINOLOGY: "Endocrinology", RHEUMATOLOGY: "Rheumatology",
  RADIOLOGY: "Radiology", PATHOLOGY: "Pathology", ANESTHESIOLOGY: "Anesthesiology",
  EMERGENCY_MEDICINE: "Emergency Medicine", FAMILY_MEDICINE: "Family Medicine",
  INTERNAL_MEDICINE: "Internal Medicine", PLASTIC_SURGERY: "Plastic Surgery",
  GENERAL_SURGERY: "General Surgery", OTHER: "Other",
};

export const HOSPITAL_ROLE_LABELS: Record<HospitalRole, string> = {
  CONSULTANT: "Consultant", SENIOR_CONSULTANT: "Senior Consultant", JUNIOR_DOCTOR: "Junior Doctor",
  RESIDENT: "Resident", INTERN: "Intern", VISITING_DOCTOR: "Visiting Doctor",
  HEAD_OF_DEPARTMENT: "Head of Department", MEDICAL_DIRECTOR: "Medical Director", SURGEON: "Surgeon",
  CHIEF_SURGEON: "Chief Surgeon", ATTENDING_PHYSICIAN: "Attending Physician", FELLOW: "Fellow",
};
