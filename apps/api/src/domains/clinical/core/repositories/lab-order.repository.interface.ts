import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import type { PaginatedResponse } from '@workspace/types';

export interface LabOrderQueryParams {
  search?: string;
  status?: string;
  date?: string;
  patientId?: string;
  cursor?: string;
  limit?: number;
}

export interface LabStats {
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  total: number;
}

export interface LabOrderRepository {
  findAllOrders(
    clinicId: string,
    params?: LabOrderQueryParams,
  ): Promise<PaginatedResponse<LabOrder>>;
  findOrderById(id: string, clinicId: string): Promise<LabOrder | null>;
  saveOrder(order: LabOrder): Promise<LabOrder>;
  deleteOrder(id: string, clinicId: string): Promise<void>;
  getStats(clinicId: string): Promise<LabStats>;
}
