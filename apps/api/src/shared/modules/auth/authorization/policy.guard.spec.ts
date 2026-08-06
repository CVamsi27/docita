import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { describe, expect, it, jest } from '@jest/globals';
import { REQUIRE_POLICY_KEY } from '../decorators/require-policy.decorator';
import { AuthorizationService } from './authorization.service';
import { PolicyGuard } from '../guards/policy.guard';
import { PolicyResourceResolverRegistry } from './resolvers/policy-resource-resolver';
import type { PolicyResourceResolver } from './resolvers/policy-resource-resolver.interface';
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
): ExecutionContext {
  const handler = {};
  if (handlerMeta.requirePolicy) {
    Reflect.defineMetadata(
      REQUIRE_POLICY_KEY,
      handlerMeta.requirePolicy,
      handler,
    );
  }
  return {
    getHandler: () => handler,
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id: 'pat-1' } }),
    }),
  } as unknown as ExecutionContext;
}

function makeResolver(): PolicyResourceResolver {
  const resource: ResourceAttributes = {
    type: 'patient',
    clinicId: 'clinic-a',
    ownerId: 'pat-user-1',
    assignedDoctorIds: [],
    classification: 'phi',
    requiresAssignment: false,
  };
  return {
    resource: 'patient',
    resolve: jest.fn(async () => resource),
  };
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
  const registry = new PolicyResourceResolverRegistry(makeResolver());
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

  it('denies (fail-closed) when metadata declares an unregistered resource', async () => {
    const reflector = new Reflector();
    const authorization = {
      evaluateAbac: jest.fn(async () => ({ allowed: true })),
    } as unknown as AuthorizationService;
    // Only 'patient' has a resolver; declaring any other resource must deny.
    const registry = new PolicyResourceResolverRegistry(makeResolver());
    const guard = new PolicyGuard(reflector, authorization, registry);
    const meta = { requirePolicy: { resource: 'invoice', action: 'read' } };
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
