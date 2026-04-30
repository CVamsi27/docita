import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/common/types/common.types';

type AuthenticatedUser = NonNullable<RequestWithUser['user']>;

export function requireUser(req: RequestWithUser): AuthenticatedUser {
  if (!req.user) {
    throw new UnauthorizedException('Authenticated user is required');
  }

  return req.user;
}

export function requireUserId(req: RequestWithUser): string {
  const user = requireUser(req);

  if (!user.id) {
    throw new UnauthorizedException('Authenticated user ID is required');
  }

  return user.id;
}

export function requireClinicId(req: RequestWithUser): string {
  const user = requireUser(req);

  if (!user.clinicId) {
    throw new BadRequestException('Clinic context is required');
  }

  return user.clinicId;
}

export function requireUserRole(req: RequestWithUser): Role {
  const user = requireUser(req);

  if (!user.role) {
    throw new UnauthorizedException('Authenticated user role is required');
  }

  return user.role;
}
