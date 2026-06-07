// jscpd:ignore-start
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import type { Prisma } from '@workspace/db';

export interface IAppointmentWriteRepository {
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  delete(id: string, clinicId: string): Promise<void>;

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
// jscpd:ignore-end

  /** Versioned partial update. Returns the number of rows affected (0 means tenant/id mismatch). */
  applyPatch(
    id: string,
    clinicId: string,
    patch: Prisma.AppointmentUpdateInput,
  ): Promise<number>;
}

export const APPOINTMENT_WRITE_REPOSITORY_TOKEN = Symbol(
  'IAppointmentWriteRepository',
);
