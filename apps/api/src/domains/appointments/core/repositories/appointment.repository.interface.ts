import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

export interface AppointmentListItem {
  id?: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string;
  consultationNotes?: string;
  observations?: string;
  chiefComplaint?: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  } | null;
  doctor?: {
    id: string;
    name: string;
  } | null;
}

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
  ): Promise<PaginatedResult<AppointmentListItem>>;
  findById(id: string): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  delete(id: string): Promise<void>;

  findByPatientId(patientId: string): Promise<Appointment[]>;
  findByDoctorId(doctorId: string, date: Date): Promise<Appointment[]>;
  exists(id: string): Promise<boolean>;

  findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<Array<{ doctorId: string; startTime: Date; endTime: Date }>>;
}

export const APPOINTMENT_REPOSITORY_TOKEN = Symbol('IAppointmentRepository');
