import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { describe, expect, it, jest } from '@jest/globals';
import { REQUIRE_POLICY_KEY } from '@/shared/modules/auth/decorators/require-policy.decorator';
import { EMERGENCY_ACCESS_KEY } from '@/shared/modules/auth/decorators/emergency-access.decorator';
import { AuthorizationService } from '@/shared/modules/authorization/authorization.service';
import { PolicyGuard } from '@/shared/modules/auth/guards/policy.guard';
import { PolicyResourceResolverRegistry } from '@/shared/modules/authorization/resolvers/policy-resource-resolver';
import type { PolicyResourceResolver } from '@/shared/modules/authorization/resolvers/policy-resource-resolver.interface';
import type { ResourceAttributes } from '@workspace/types';

function makeContext(
  handlerMeta: Record<string, unknown>,
  user:
    | {
        id: string;
        role: Role;
        clinicId: string | null;
        patientId?: string;
      }
    | undefined,
  headers: Record<string, string> = {},
): ExecutionContext {
  const handler = {};
  if (handlerMeta.requirePolicy) {
    Reflect.defineMetadata(
      REQUIRE_POLICY_KEY,
      handlerMeta.requirePolicy,
      handler,
    );
  }
  if (handlerMeta.emergencyAccess) {
    Reflect.defineMetadata(EMERGENCY_ACCESS_KEY, true, handler);
  }
  const request = { user, params: { id: 'pat-1' }, headers };
  return {
    getHandler: () => handler,
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function makeResolver(resource: string): PolicyResourceResolver {
  const attributes: ResourceAttributes = {
    type: resource,
    clinicId: 'clinic-a',
    ownerId: 'pat-user-1',
    assignedDoctorIds: [],
    classification: 'phi',
    requiresAssignment: false,
  };
  return {
    resource,
    resolve: jest.fn(async () => attributes),
  };
}

function makeResolverRegistry() {
  // Mirrors the DI-registered resolver set (lockstep with the ABAC registry).
  return new PolicyResourceResolverRegistry(
    makeResolver('patient'),
    makeResolver('appointment'),
    makeResolver('prescription'),
    makeResolver('invoice'),
    makeResolver('lab-order'),
    makeResolver('audit-log'),
  );
}

function makeGuard(options: { allow?: boolean } = {}) {
  const reflector = new Reflector();
  const authorization = {
    evaluateAbac: jest.fn(async () =>
      options.allow === false
        ? { allowed: false, reason: 'ownership_denied' as const }
        : { allowed: true },
    ),
  } as unknown as AuthorizationService;
  const registry = makeResolverRegistry();
  return {
    guard: new PolicyGuard(reflector, authorization, registry),
    authorization,
  };
}

describe('PolicyGuard', () => {
  it('passes through when no @RequirePolicy metadata is present', async () => {
    const { guard } = makeGuard();
    const result = await guard.canActivate(
      makeContext({}, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' }),
    );
    expect(result).toBe(true);
  });

  it('denies (fail-closed) when metadata exists but there is no user', async () => {
    const { guard } = makeGuard();
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    await expect(
      guard.canActivate(makeContext(meta, undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies when the policy decision is a deny', async () => {
    const { guard } = makeGuard({ allow: false });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    await expect(
      guard.canActivate(
        makeContext(meta, {
          id: 'u1',
          role: Role.DOCTOR,
          clinicId: 'clinic-a',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows when the policy decision allows', async () => {
    const { guard, authorization } = makeGuard({ allow: true });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    const result = await guard.canActivate(
      makeContext(meta, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' }),
    );
    expect(result).toBe(true);
    expect(authorization.evaluateAbac).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', roles: ['DOCTOR'] }),
      'read',
      expect.objectContaining({ type: 'patient', clinicId: 'clinic-a' }),
    );
  });

  it('allows emergency access (x-break-the-glass) on an @EmergencyAccess route without an assignment', async () => {
    const { guard, authorization } = makeGuard({ allow: false });
    const meta = {
      requirePolicy: { resource: 'patient', action: 'read' },
      emergencyAccess: true,
    };
    const context = makeContext(
      meta,
      { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' },
      { 'x-break-the-glass': 'true' },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(authorization.evaluateAbac).not.toHaveBeenCalled();
  });

  it('still denies emergency access on a route that is NOT @EmergencyAccess-eligible', async () => {
    const { guard } = makeGuard({ allow: false });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    const context = makeContext(
      meta,
      { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' },
      { 'x-break-the-glass': 'true' },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies (fail-closed) when metadata declares an unregistered resource', async () => {
    const reflector = new Reflector();
    const authorization = {
      evaluateAbac: jest.fn(async () => ({ allowed: true })),
    } as unknown as AuthorizationService;
    // Only the six registered resources have resolvers; declaring any other
    // resource must deny (fail-closed on misconfiguration).
    const registry = makeResolverRegistry();
    const guard = new PolicyGuard(reflector, authorization, registry);
    // Deliberately off-map — every registered resource now has a resolver;
    // declaring an unknown resource must deny (fail-closed).
    const meta = {
      requirePolicy: { resource: 'not-a-resource', action: 'read' },
    };
    await expect(
      guard.canActivate(
        makeContext(meta, {
          id: 'u1',
          role: Role.DOCTOR,
          clinicId: 'clinic-a',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
