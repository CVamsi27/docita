import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/common/types/common.types';
import {
  requireClinicId,
  requireUser,
  requireUserId,
  requireUserRole,
} from './request-context.utils';

describe('request-context utils', () => {
  const request = {
    user: {
      id: 'user-1',
      clinicId: 'clinic-1',
      role: Role.DOCTOR,
    },
  } as RequestWithUser;

  it('returns required user context values', () => {
    expect(requireUser(request)).toBe(request.user);
    expect(requireUserId(request)).toBe('user-1');
    expect(requireClinicId(request)).toBe('clinic-1');
    expect(requireUserRole(request)).toBe(Role.DOCTOR);
  });

  it('throws UnauthorizedException when user context is missing', () => {
    expect(() => requireUser({} as RequestWithUser)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws BadRequestException when clinic context is missing', () => {
    expect(() =>
      requireClinicId({
        user: { id: 'user-1', role: Role.DOCTOR },
      } as RequestWithUser),
    ).toThrow(BadRequestException);
  });
});
