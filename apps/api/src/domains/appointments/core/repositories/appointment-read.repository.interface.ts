import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type {
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from './appointment-repository.types';

export type {
  AppointmentListItem,
  AppointmentSearchParams,
  PaginatedResult,
} from './appointment-repository.types';

export interface IAppointmentReadRepository {
  findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<AppointmentListItem>>;
  findById(id: string, clinicId: string): Promise<Appointment | null>;
  findByPatientId(patientId: string, clinicId: string): Promise<Appointment[]>;
  findByDoctorId(
    doctorId: string,
    date: Date,
    clinicId: string,
    timezone?: string,
  ): Promise<Appointment[]>;
  exists(id: string, clinicId: string): Promise<boolean>;

  /** Appointments whose interval overlaps `[rangeStart, rangeEndExclusive)` (UTC instants). */
  findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<Array<{ doctorId: string; startTime: Date; endTime: Date }>>;

  /** Returns clinic tier + plan mode for Front Desk gating, or null if clinic missing. */
  findClinicTier(
    clinicId: string,
  ): Promise<{ tier: string; planMode: string | null } | null>;

  /** IANA timezone for clinic-local scheduling (defaults handled by caller). */
  findClinicTimezone(clinicId: string): Promise<string | null>;

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
}

export const APPOINTMENT_READ_REPOSITORY_TOKEN = Symbol(
  'IAppointmentReadRepository',
);
