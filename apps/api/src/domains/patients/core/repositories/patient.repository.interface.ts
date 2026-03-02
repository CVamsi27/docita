import { Patient } from '@/domains/patients/core/entities/patient.entity';

export interface PatientSearchParams {
  clinicId: string;
  search?: string;
  gender?: string;
  page?: number;
  limit?: number;
}

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByMrn(mrn: string, clinicId: string): Promise<Patient | null>;
  findAll(
    params: PatientSearchParams,
  ): Promise<{ items: Patient[]; total: number }>;
  save(patient: Patient): Promise<void>;
  update(patient: Patient): Promise<void>;
  delete(id: string): Promise<void>;
}
