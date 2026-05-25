import { ForbiddenException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { describe, expect, it } from '@jest/globals';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import {
  getClinicStaffRequestContext,
  requireAuthenticatedUserId,
} from './clinic-request-context';

describe('getClinicStaffRequestContext', () => {
  const req = (user: RequestWithUser['user']): RequestWithUser =>
    ({ user }) as RequestWithUser;

  it('returns clinicId, userId, and role when present', () => {
    expect(
      getClinicStaffRequestContext(
        req({
          id: 'user-1',
          clinicId: 'clinic-1',
          role: Role.DOCTOR,
        } as unknown as RequestWithUser['user']),
      ),
    ).toEqual({
      clinicId: 'clinic-1',
      userId: 'user-1',
      role: Role.DOCTOR,
    });
  });

  it('prefers sub over id for userId', () => {
    expect(
      getClinicStaffRequestContext(
        req({
          sub: 'sub-1',
          id: 'user-1',
          clinicId: 'clinic-1',
          role: Role.RECEPTIONIST,
        } as unknown as RequestWithUser['user']),
      ),
    ).toMatchObject({ userId: 'sub-1' });
  });

  it('requireAuthenticatedUserId returns id without clinic', () => {
    expect(
      requireAuthenticatedUserId(
        req({
          id: 'user-1',
          role: Role.PATIENT,
        } as unknown as RequestWithUser['user']),
      ),
    ).toBe('user-1');
  });

  it('throws when clinic or user is missing', () => {
    expect(() =>
      getClinicStaffRequestContext(
        req({ id: 'user-1' } as unknown as RequestWithUser['user']),
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      getClinicStaffRequestContext(
        req({
          clinicId: 'clinic-1',
          role: Role.DOCTOR,
        } as unknown as RequestWithUser['user']),
      ),
    ).toThrow(ForbiddenException);
  });
});
