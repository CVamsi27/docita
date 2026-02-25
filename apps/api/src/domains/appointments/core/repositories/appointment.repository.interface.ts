/**
 * Appointment Repository Interface
 * Follows the DDD repository pattern using domain entities
 */

import { Appointment } from '../entities/appointment.entity';
import { AppointmentStatusEnum } from '../value-objects/appointment-status.value-object';

export interface AppointmentSearchParams {
  clinicId: string;
  startDate?: Date;
  endDate?: Date;
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatusEnum[];
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export interface IAppointmentRepository {
  findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<Appointment>>;
  findById(id: string): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  delete(id: string): Promise<void>;

  // Custom queries
  findByPatientId(patientId: string): Promise<Appointment[]>;
  findByDoctorId(doctorId: string, date: Date): Promise<Appointment[]>;
  exists(id: string): Promise<boolean>;
}
