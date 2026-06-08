import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';

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

export interface LabOrderRepository {
  findAllOrders(
    clinicId: string,
    params?: LabOrderQueryParams,
  ): Promise<LabOrder[]>;
  findOrderById(id: string): Promise<LabOrder | null>;
  saveOrder(order: LabOrder): Promise<LabOrder>;
  deleteOrder(id: string): Promise<void>;
  getStats(clinicId: string): Promise<LabStats>;
}
