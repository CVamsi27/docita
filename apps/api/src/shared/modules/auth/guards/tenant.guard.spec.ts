import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { TenantGuard } from './tenant.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: TenantGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new TenantGuard(reflector);
  });

  it('should allow public route', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(true) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    const allowed = guard.canActivate(createContext({}));
    expect(allowed).toBe(true);
  });

  it('should allow SUPER_ADMIN without clinicId', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.SUPER_ADMIN, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should allow no-clinic route when AllowNoClinic is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(true); // allowNoClinic

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should reject authenticated user without clinic for clinic-scoped route', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    expect(() =>
      guard.canActivate(
        createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should reject clinic mismatch from params/query/body', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    expect(() =>
      guard.canActivate(
        createContext({
          user: { role: Role.ADMIN, clinicId: 'clinic-1' },
          params: { clinicId: 'clinic-2' },
          query: { clinicId: 'clinic-1' },
          body: { nested: { clinicId: 'clinic-1' } },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should allow matching clinicId across request parts', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    const allowed = guard.canActivate(
      createContext({
        user: { role: Role.ADMIN, clinicId: 'clinic-1' },
        params: { clinicId: 'clinic-1' },
        query: { filter: 'active' },
        body: { payload: { clinicId: 'clinic-1' } },
      }),
    );
    expect(allowed).toBe(true);
  });
});
