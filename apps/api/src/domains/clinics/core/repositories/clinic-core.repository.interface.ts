import { Clinic } from '@workspace/db';
import type {
  ClinicDetailsItem,
  ClinicListItem,
  ClinicLookup,
  ClinicSearchResult,
  ClinicStats,
  CreateClinicInput,
  DoctorClinicItem,
  UpdateClinicInput,
} from './clinic-repository.types';

export type {
  CreateClinicInput,
  UpdateClinicInput,
  ClinicStats,
  ClinicLookup,
  ClinicSearchResult,
  ClinicListItem,
  ClinicDetailsItem,
  DoctorClinicItem,
} from './clinic-repository.types';

export interface IClinicCoreRepository {
  findByReferralCode(code: string): Promise<{ id: string } | null>;
  create(data: CreateClinicInput): Promise<Clinic>;
  findAll(): Promise<ClinicListItem[]>;
  findById(id: string): Promise<ClinicDetailsItem | null>;
  update(id: string, data: UpdateClinicInput): Promise<Clinic>;
  softDelete(id: string): Promise<Clinic>;
  findDoctorClinics(doctorId: string): Promise<DoctorClinicItem[]>;
  getStats(clinicId: string): Promise<ClinicStats>;
  findClinicByCodeOrEmail(
    code?: string,
    email?: string,
  ): Promise<ClinicLookup | null>;
  searchActive(query: string): Promise<ClinicSearchResult[]>;
}

export const CLINIC_CORE_REPOSITORY_TOKEN = Symbol('IClinicCoreRepository');
