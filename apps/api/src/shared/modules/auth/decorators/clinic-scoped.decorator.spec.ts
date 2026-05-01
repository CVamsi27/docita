import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  asType,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyBranch,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import {
  CLINIC_SCOPED_KEY,
  ClinicScopedGuard,
  ValidateClinicScope,
} from './clinic-scoped.decorator';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('ClinicScopedGuard', () => {
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let guard: ClinicScopedGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([]),
    };
    guard = new ClinicScopedGuard(asType<Reflector>(reflector));
  });

  it('marks request as empty when clinic is missing and returnEmptyOnMissing is true', () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      CLINIC_SCOPED_KEY,
      { returnEmptyOnMissing: true },
      undefined,
    );
    const request: Record<string, unknown> = {};

    const allowed = guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(request._clinicScopedEmpty).toBe(true);
  });

  it('uses custom paramName and allows request', () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      CLINIC_SCOPED_KEY,
      { paramName: 'facilityId' },
      undefined,
    );
    const request = {
      query: { facilityId: 'clinic-1' },
    };

    const allowed = guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
  });
});

describe('ValidateClinicScope', () => {
  it('returns default empty result when clinic argument is missing', () => {
    class TestService {
      list(_clinicId?: string) {
        return { items: ['real'] };
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestService.prototype,
      'list',
    );
    if (!descriptor) {
      throw new Error('Descriptor not found');
    }

    ValidateClinicScope()(TestService.prototype, 'list', descriptor);
    Object.defineProperty(TestService.prototype, 'list', descriptor);

    const service = new TestService();
    expect(service.list(undefined)).toEqual({
      items: [],
      hasMore: false,
      count: 0,
    });
  });

  it('returns custom empty result with alternate arg index', () => {
    class TestService {
      list(_search: string, clinicId?: string) {
        return { items: [clinicId] };
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestService.prototype,
      'list',
    );
    if (!descriptor) {
      throw new Error('Descriptor not found');
    }

    ValidateClinicScope({
      argIndex: 1,
      emptyResult: { rows: [] },
    })(TestService.prototype, 'list', descriptor);
    Object.defineProperty(TestService.prototype, 'list', descriptor);

    const service = new TestService();
    expect(service.list('q', undefined)).toEqual({ rows: [] });
    expect(service.list('q', 'clinic-1')).toEqual({ items: ['clinic-1'] });
  });
});
