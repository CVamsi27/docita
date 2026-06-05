import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
  LabType,
} from '@workspace/db';

export interface LabOrderQueryParams {
  search?: string;
  status?: string;
  date?: string;
  patientId?: string;
}

export interface LabStats {
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  total: number;
}

export interface LabQueueQueryParams {
  /** Restrict to a single lab (the caller's assigned lab, for LAB users). */
  labId?: string;
  status?: string;
  search?: string;
}

/** Enriched read model for the lab workspace queue and order detail. */
export interface LabQueueItem {
  id: string;
  clinicId: string;
  labId: string | null;
  status: string;
  notes: string | null;
  resultUrl: string | null;
  resultUploadedAt: Date | null;
  collectedAt: Date | null;
  completedAt: Date | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  releasedAt: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
  labTest: {
    id: string;
    name: string;
    specimenType: string | null;
  };
}

/** Minimal context needed to release a result over WhatsApp. */
export interface LabOrderReleaseContext {
  id: string;
  clinicId: string;
  status: string;
  resultUrl: string | null;
  paidAt: Date | null;
  testName: string;
  clinicName: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
}

export interface LabRecord {
  id: string;
  clinicId: string;
  name: string;
  type: LabType;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabRepository {
  findAllTests(clinicId: string): Promise<LabTest[]>;
  findTestById(id: string): Promise<LabTest | null>;
  saveTest(labTest: LabTest): Promise<LabTest>;

  findAllOrders(
    clinicId: string,
    params?: LabOrderQueryParams,
  ): Promise<LabOrder[]>;
  findOrderById(id: string): Promise<LabOrder | null>;
  saveOrder(order: LabOrder): Promise<LabOrder>;
  deleteOrder(id: string): Promise<void>;
  getStats(clinicId: string): Promise<LabStats>;

  // --- Lab workspace workflow (targeted updates; tenant-scoped) ---
  findLabQueue(
    clinicId: string,
    params?: LabQueueQueryParams,
  ): Promise<LabQueueItem[]>;
  findReleaseContext(
    id: string,
    clinicId: string,
  ): Promise<LabOrderReleaseContext | null>;
  markSampleCollected(
    id: string,
    clinicId: string,
    notes: string | undefined,
    now: Date,
  ): Promise<void>;
  attachResult(
    id: string,
    clinicId: string,
    data: {
      resultUrl: string;
      result?: Record<string, unknown>;
      notes?: string;
      uploadedBy: string;
    },
    now: Date,
  ): Promise<void>;
  verifyPayment(
    id: string,
    clinicId: string,
    data: { method: string; reference?: string; verifiedBy: string },
    now: Date,
  ): Promise<void>;
  markReleased(id: string, clinicId: string, now: Date): Promise<void>;

  // --- Lab directory (internal/external) ---
  findAllLabs(clinicId: string): Promise<LabRecord[]>;
  findLabById(id: string, clinicId: string): Promise<LabRecord | null>;
  createLab(
    clinicId: string,
    data: {
      name: string;
      type: LabType;
      phone?: string;
      email?: string;
      address?: string;
    },
  ): Promise<LabRecord>;
  updateLab(
    id: string,
    clinicId: string,
    data: Partial<{
      name: string;
      type: LabType;
      phone: string;
      email: string;
      address: string;
      active: boolean;
    }>,
  ): Promise<LabRecord>;
}

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
