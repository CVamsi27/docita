import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { type UpdateAppointmentRequest } from '@workspace/types';

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
): PrismaAppointmentStatus | undefined {
  switch (status) {
    case 'scheduled':
      return PrismaAppointmentStatus.SCHEDULED;
    case 'confirmed':
    case 'checked-in':
      return PrismaAppointmentStatus.CONFIRMED;
    case 'in-progress':
      return PrismaAppointmentStatus.IN_PROGRESS;
    case 'completed':
      return PrismaAppointmentStatus.COMPLETED;
    case 'cancelled':
      return PrismaAppointmentStatus.CANCELLED;
    case 'no-show':
      return PrismaAppointmentStatus.NO_SHOW;
    default:
      return undefined;
  }
}

/** Build a Prisma `AppointmentUpdateInput` patch from a partial domain update request. */
export function toPrismaAppointmentUpdate(
  input: Partial<UpdateAppointmentRequest>,
): Prisma.AppointmentUpdateInput {
  const { status, ...rest } = input;
  const prismaStatus = mapStatusToPrisma(status);
  const patch: Prisma.AppointmentUpdateInput = {
    ...(rest as unknown as Prisma.AppointmentUpdateInput),
  };
  if (prismaStatus) {
    patch.status = prismaStatus;
  }
  return patch;
}
