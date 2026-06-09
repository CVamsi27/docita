import { Specialization, HospitalRole } from '@workspace/types';

export interface CreatePrescriptionMedication {
  [key: string]: unknown;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  ndcCode?: string;
  rxNormCui?: string;
  dosageForm?: string;
  strengthValue?: number;
  strengthUnit?: string;
  sigCode?: string;
  quantity?: number;
  refillsAllowed?: number;
  dispenseAsWritten?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
  isPRN?: boolean;
  prnInstructions?: string;
  prnMaxDose?: string;
  specialInstructions?: string;
  indication?: string;
}

export interface CreatePrescriptionParams {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  instructions?: string;
  medications: CreatePrescriptionMedication[];
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: Specialization;
  doctorRole?: HospitalRole;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
  clinicId?: string;
}
