import { LabTest } from '../entities/lab-test.entity';
import { LabOrder } from '../entities/lab-order.entity';
import { IcdCode, CptCode, DoctorFavoriteCode } from '@workspace/db';

export interface ILabRepository {
  // Lab Test Methods
  findAllTests(clinicId: string): Promise<LabTest[]>;
  findTestById(id: string): Promise<LabTest | null>;
  saveTest(labTest: LabTest): Promise<LabTest>;

  // Lab Order Methods
  findAllOrders(
    clinicId: string,
    params?: {
      search?: string;
      status?: string;
      date?: string;
      patientId?: string;
    },
  ): Promise<LabOrder[]>;
  findOrderById(id: string): Promise<LabOrder | null>;
  saveOrder(order: LabOrder): Promise<LabOrder>;
  deleteOrder(id: string): Promise<void>;
  getStats(clinicId: string): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>;
}

export interface IMedicalCodingRepository {
  searchIcdCodes(query: string): Promise<IcdCode[]>;
  findIcdByCode(code: string): Promise<IcdCode | null>;
  searchCptCodes(query: string): Promise<CptCode[]>;
  getFavorites(userId: string): Promise<IcdCode[]>;
  addFavorite(userId: string, icdCodeId: string): Promise<DoctorFavoriteCode>;
  removeFavorite(userId: string, icdCodeId: string): Promise<void>;
  getCptFavorites(userId: string): Promise<CptCode[]>;
  addCptFavorite(
    userId: string,
    cptCodeId: string,
  ): Promise<DoctorFavoriteCode>;
  removeCptFavorite(userId: string, cptCodeId: string): Promise<void>;
  getUncodedVisits(clinicId: string, search?: string): Promise<any[]>;
}
