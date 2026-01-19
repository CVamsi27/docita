/**
 * IPD (In-Patient Department) Types
 * Types for hospital bed management and patient admissions
 */

export interface CreateWardDto {
  name: string;
  capacity: number;
  clinicId: string;
  description?: string;
  floor?: string;
}

export interface CreateRoomDto {
  wardId: string;
  roomNumber: string;
  roomType?: 'GENERAL' | 'PRIVATE' | 'ICU' | 'SEMI_PRIVATE';
  capacity?: number;
}

export interface CreateBedDto {
  roomId: string;
  bedNumber: string;
  bedType?: 'STANDARD' | 'ICU' | 'VENTILATOR';
}

export interface UpdateBedStatusDto {
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
}

export interface AdmitPatientDto {
  patientId: string;
  bedId: string;
  admittingDoctorId: string;
  admissionDate?: Date;
  admissionReason?: string;
  expectedDischargeDate?: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
}

export interface DischargePatientDto {
  dischargeDate?: Date;
  dischargeSummary?: string;
  dischargeInstructions?: string;
  followUpDate?: Date;
}
