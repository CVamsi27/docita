import { ForbiddenException } from '@nestjs/common';
import { RequestWithUser } from '@/shared/common/types/common.types';

export function assertOwnClinic(req: RequestWithUser, clinicId: string): void {
  if (req.user?.clinicId !== clinicId) {
    throw new ForbiddenException(
      'You can only manage compliance for your own clinic',
    );
  }
}

export function getClinicRequestUserId(req: RequestWithUser): string {
  if (!req.user?.id) {
    throw new ForbiddenException('Authenticated user is required');
  }

  return req.user.id;
}

export function getClinicRequestIpAddress(
  req: RequestWithUser,
): string | undefined {
  return req.ip || req.socket?.remoteAddress;
}

export function assertOwnClinicStaff(
  req: RequestWithUser,
  clinicId: string,
  resource: 'doctors' | 'receptionists' | 'members',
): void {
  if (req.user?.clinicId !== clinicId) {
    throw new ForbiddenException(
      `You can only manage ${resource} in your own clinic`,
    );
  }
}
