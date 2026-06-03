import { AppointmentStatus, Prisma } from '@workspace/db';
import { type UpdateAppointmentRequest } from '@workspace/types';
import {
  parseAppointmentStatus,
  APPOINTMENT_STATUS_TO_PRISMA,
} from '@/domains/appointments/infrastructure/mappers/appointment.mapper';

/** Safely coerce an unknown value to a Date, falling back to `fallback`. */
export function coerceAppointmentDate(
  candidate: unknown,
  fallback: Date,
): Date {
  if (candidate === undefined || candidate === null) {
    return new Date(fallback.getTime());
  }
  if (candidate instanceof Date) {
    return new Date(candidate.getTime());
  }
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(fallback.getTime());
}

function mapStatusToPrisma(
  status: UpdateAppointmentRequest['status'] | undefined,
): AppointmentStatus | undefined {
  if (!status) return undefined;
  const domainStatus = parseAppointmentStatus(status);
  if (!domainStatus) return undefined;
  return APPOINTMENT_STATUS_TO_PRISMA[domainStatus];
}

/** Build a Prisma `AppointmentUpdateInput` patch from a partial domain update request. */
export function toPrismaAppointmentUpdate(
  input: Partial<UpdateAppointmentRequest>,
): Prisma.AppointmentUpdateInput {
  const { status, ...rest } = input;
  const prismaStatus = mapStatusToPrisma(status);
  const patch: Prisma.AppointmentUpdateInput = { ...rest };
  if (prismaStatus) {
    patch.status = prismaStatus;
  }
  return patch;
}
