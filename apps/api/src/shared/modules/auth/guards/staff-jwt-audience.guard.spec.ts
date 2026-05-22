import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from '@jest/globals';
import { StaffJwtAudienceGuard } from './staff-jwt-audience.guard';
import { JWT_AUDIENCE_PATIENT_PORTAL } from '@/shared/modules/auth/auth/jwt-audience';
import { PATIENT_PORTAL_SESSION_KEY } from '@/shared/modules/auth/auth/patient-portal-session.decorator';

describe('StaffJwtAudienceGuard', () => {
  const reflector = new Reflector();
  const guard = new StaffJwtAudienceGuard(reflector);

  const context = {
    getHandler: () => () => undefined,
    getClass: () => StaffJwtAudienceGuard,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { jwtAudience: JWT_AUDIENCE_PATIENT_PORTAL },
      }),
    }),
  } as never;

  it('blocks patient-portal audience on staff routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows patient-portal audience when route is marked', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      return key === PATIENT_PORTAL_SESSION_KEY;
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
