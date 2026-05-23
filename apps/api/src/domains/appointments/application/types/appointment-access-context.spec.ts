import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@workspace/db';
import {
  assertDoctorOwnsAppointment,
  getAppointmentAccessContext,
} from './appointment-access-context';

describe('appointment-access-context', () => {
  it('requires authenticated user on controller boundary', () => {
    expect(() =>
      getAppointmentAccessContext({ user: undefined } as never),
    ).toThrow(UnauthorizedException);
  });

  it('returns userId and role when present', () => {
    expect(
      getAppointmentAccessContext({
        user: { id: 'u1', role: Role.DOCTOR },
      } as never),
    ).toEqual({ userId: 'u1', role: Role.DOCTOR });
  });

  it('blocks doctors from other doctors appointments', () => {
    expect(() =>
      assertDoctorOwnsAppointment(
        { userId: 'doc-a', role: Role.DOCTOR },
        'doc-b',
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows admins to update any appointment', () => {
    expect(() =>
      assertDoctorOwnsAppointment(
        { userId: 'admin-1', role: Role.ADMIN },
        'doc-b',
      ),
    ).not.toThrow();
  });
});
