import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Role } from '@workspace/db';
import { ALLOW_NO_CLINIC_KEY } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';
import { IS_PUBLIC_KEY } from '@/shared/modules/auth/auth/public.decorator';
import { mockGetAllAndOverrideKeyMap } from '@/test-utils';
import { TenantGuard } from './tenant.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  const context = new ExecutionContextHost([request, undefined, undefined]);
  context.setType('http');
  return context;
}

function mockTenantMetadataFlags(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  flags: { isPublic: boolean; allowNoClinic: boolean },
): void {
  mockGetAllAndOverrideKeyMap(mock, [
    [IS_PUBLIC_KEY, flags.isPublic],
    [ALLOW_NO_CLINIC_KEY, flags.allowNoClinic],
  ]);
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
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: true,
      allowNoClinic: false,
    });

    const allowed = guard.canActivate(createContext({}));
    expect(allowed).toBe(true);
  });

  it('should allow INTERNAL without clinicId', () => {
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: false,
      allowNoClinic: false,
    });

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.INTERNAL, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should allow no-clinic route when AllowNoClinic is set', () => {
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: false,
      allowNoClinic: true,
    });

    const allowed = guard.canActivate(
      createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
    );
    expect(allowed).toBe(true);
  });

  it('should reject authenticated user without clinic for clinic-scoped route', () => {
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: false,
      allowNoClinic: false,
    });

    expect(() =>
      guard.canActivate(
        createContext({ user: { role: Role.DOCTOR, clinicId: null } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should reject clinic mismatch from params/query/body', () => {
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: false,
      allowNoClinic: false,
    });

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
    mockTenantMetadataFlags(getAllAndOverrideMock, {
      isPublic: false,
      allowNoClinic: false,
    });

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
