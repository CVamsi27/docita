import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Role } from '@workspace/db';
import { TenantGuard } from './tenant.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  const context = new ExecutionContextHost([request, undefined, undefined]);
  context.setType('http');
  return context;
}

describe('TenantGuard', () => {
  let reflector: Reflector;
  let getAllAndOverrideMock: jest.MockedFunction<
    Reflector['getAllAndOverride']
  >;
  let guard: TenantGuard;

  beforeEach(() => {
    reflector = Object.create(Reflector.prototype) as Reflector;
    getAllAndOverrideMock = jest.fn() as jest.MockedFunction<
      Reflector['getAllAndOverride']
    >;
    reflector.getAllAndOverride = getAllAndOverrideMock;
    guard = new TenantGuard(reflector);
  });

  it('should allow public route', () => {
    getAllAndOverrideMock
      .mockReturnValueOnce(true) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    const allowed = guard.canActivate(createContext({}));
    expect(allowed).toBe(true);
  });

  it('should allow INTERNAL without clinicId', () => {
    getAllAndOverrideMock
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.INTERNAL, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should allow no-clinic route when AllowNoClinic is set', () => {
    getAllAndOverrideMock
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(true); // allowNoClinic

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should reject authenticated user without clinic for clinic-scoped route', () => {
    getAllAndOverrideMock
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(false); // allowNoClinic

    expect(() =>
      guard.canActivate(
        createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should reject clinic mismatch from params/query/body', () => {
    getAllAndOverrideMock
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
    getAllAndOverrideMock
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
