import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { Prisma } from '@workspace/db';
import type { DentalChartData } from '@workspace/types';

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
  dentalChart?: DentalChartData;
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
  /**
   * When true with both dates set, match appointments whose interval intersects
   * `[startDate, endDate)` (end exclusive). Used for clinic-local calendar days.
   */
  intersectCalendarRange?: boolean;
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
  findById(id: string, clinicId: string): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  delete(id: string, clinicId: string): Promise<void>;

  findByPatientId(patientId: string, clinicId: string): Promise<Appointment[]>;
  findByDoctorId(
    doctorId: string,
    date: Date,
    clinicId: string,
  ): Promise<Appointment[]>;
  exists(id: string, clinicId: string): Promise<boolean>;

  /** Appointments whose interval overlaps `[rangeStart, rangeEndExclusive)` (UTC instants). */
  findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<Array<{ doctorId: string; startTime: Date; endTime: Date }>>;

  /** Returns the clinic's `settings.workspaceProfile` for FRONT_DESK gating, or null if clinic missing. */
  findClinicWorkspaceProfile(
    clinicId: string,
  ): Promise<{ settings: unknown } | null>;

  /** Narrow read used before transitioning an appointment to IN_PROGRESS. */
  findForConsultationStart(
    id: string,
    clinicId: string,
  ): Promise<{
    id: string;
    clinicId: string;
    doctorId: string;
    status: AppointmentStatusEnum;
    queueToken: {
      id: string;
      status: string;
      calledAt: Date | null;
      consultationStart: Date | null;
    } | null;
  } | null>;

  /** Transactional state change: appointment.status → IN_PROGRESS and optional queueToken sync. */
  startConsultationTx(
    id: string,
    clinicId: string,
    queueToken: {
      id: string;
      calledAt: Date | null;
      consultationStart: Date | null;
    } | null,
    currentStatus: AppointmentStatusEnum,
  ): Promise<void>;

  /** Narrow read used before applying partial updates (ownership + schedule diffing). */
  findForUpdate(
    id: string,
    clinicId: string,
  ): Promise<{
    id: string;
    clinicId: string;
    patientId: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
  } | null>;

  /** Versioned partial update. Returns the number of rows affected (0 means tenant/id mismatch). */
  applyPatch(
    id: string,
    clinicId: string,
    patch: Prisma.AppointmentUpdateInput,
  ): Promise<number>;
}

export const APPOINTMENT_REPOSITORY_TOKEN = Symbol('IAppointmentRepository');
