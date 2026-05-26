import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/shared/common/types/common.types';

export type AppointmentAccessContext = {
  userId: string;
  role: Role;
};

export function getAppointmentAccessContext(
  req: RequestWithUser,
): AppointmentAccessContext {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    throw new UnauthorizedException(
      'Authenticated user context is required for this appointment action',
    );
  }

  return { userId, role };
}

/** Enforces doctor-scoped appointment mutations and reads. */
export function assertDoctorOwnsAppointment(
  accessContext: AppointmentAccessContext,
  doctorId: string,
): void {
  if (accessContext.role === Role.DOCTOR && accessContext.userId !== doctorId) {
    throw new ForbiddenException('Doctors can only access their appointments');
  }
}
