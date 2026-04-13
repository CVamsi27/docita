import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
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
}
