import { Prescription, Prisma } from '@workspace/db';

export interface PrescriptionSearchParams {
  clinicId: string;
  search?: string;
  date?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface IPrescriptionRepository {
  findAll(
    params: PrescriptionSearchParams,
  ): Promise<Prescription[] | PaginatedResult<Prescription>>;
  findById(id: string): Promise<Prescription | null>;
  create(data: Prisma.PrescriptionCreateInput): Promise<Prescription>;
  update(
    id: string,
    data: Prisma.PrescriptionUpdateInput,
  ): Promise<Prescription>;
  delete(id: string): Promise<void>;
  findPatientWithAllergies(patientId: string): Promise<any | null>;
}
