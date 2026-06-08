import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';
import type { LabTestCatalogRepository } from './lab-test-catalog.repository.interface';
import type { LabOrderRepository } from './lab-order.repository.interface';
import type { LabWorkflowRepository } from './lab-workflow.repository.interface';
import type { LabDirectoryRepository } from './lab-directory.repository.interface';

/** Composite marker for the prisma lab repository, which implements all four sub-interfaces. */
export interface ILabRepository
  extends LabTestCatalogRepository,
    LabOrderRepository,
    LabWorkflowRepository,
    LabDirectoryRepository {}

export interface IMedicalCodingRepository {
  searchIcdCodes(query: string, limit: number): Promise<IcdCode[]>;
  searchCptCodes(query: string, limit: number): Promise<CptCode[]>;
  getFavorites(userId: string): Promise<IcdCode[]>;
  getCommonIcdCodes(limit?: number): Promise<IcdCode[]>;
  addFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode>;
  removeFavorite(userId: string, icdCodeId: string): Promise<void>;
  getCptFavorites(userId: string): Promise<CptCode[]>;
  getCommonCptCodes(limit?: number): Promise<CptCode[]>;
  addCptFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode>;
  removeCptFavorite(userId: string, cptCodeId: string): Promise<void>;
  getUncodedVisits(clinicId: string, search?: string): Promise<Appointment[]>;
  findExistingIcdCodes(codes: string[]): Promise<SyncedMedicalCodeRecord[]>;
  createCommonIcdCodes(records: MedicalCodeSyncRecord[]): Promise<void>;
  updateCommonIcdCodes(records: MedicalCodeSyncRecord[]): Promise<void>;
  findExistingCptCodes(codes: string[]): Promise<SyncedMedicalCodeRecord[]>;
  createCommonCptCodes(records: MedicalCodeSyncRecord[]): Promise<void>;
  updateCommonCptCodes(records: MedicalCodeSyncRecord[]): Promise<void>;
}

export type MedicalCodeSyncRecord = {
  code: string;
  description: string;
  category: string;
};

export type SyncedMedicalCodeRecord = MedicalCodeSyncRecord & {
  isCommon: boolean;
};
