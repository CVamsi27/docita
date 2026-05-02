import { Test, TestingModule } from '@nestjs/testing';
import { ContextType, ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { IS_PUBLIC_KEY } from '@/shared/modules/auth/auth/public.decorator';
import { IS_UPLOAD_SESSION_SECRET_ROUTE_KEY } from '@/shared/modules/auth/auth/upload-session-secret-route.decorator';
import { ROLES_KEY } from '@/shared/modules/auth/auth/roles.decorator';
import {
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyMap,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

type AuthUser = {
  id: string;
  role: string;
  clinicId?: string;
};

const noopHandler = (): void => {};

const createExecutionContext = (user?: AuthUser): ExecutionContext => ({
  getHandler: () => noopHandler,
  getClass: <T = RolesGuard>() => RolesGuard as Type<T>,
  switchToHttp: () => ({
    getRequest: <T = { user?: AuthUser }>() => ({ user }) as T,
    getResponse: <T = undefined>() => undefined as T,
    getNext: <T = undefined>() => undefined as T,
  }),
  switchToRpc: () => ({
    getData: <T = undefined>() => undefined as T,
    getContext: <T = undefined>() => undefined as T,
  }),
  switchToWs: () => ({
    getClient: <T = undefined>() => undefined as T,
    getData: <T = undefined>() => undefined as T,
    getPattern: <T = undefined>() => undefined as T,
  }),
  getType: <TContext extends string = ContextType>() => 'http' as TContext,
  getArgs: <
    T extends Array<{ user?: AuthUser }> = Array<{ user?: AuthUser }>,
  >() => [{ user }] as T,
  getArgByIndex: <T = { user?: AuthUser }>(index: number) =>
    [{ user }][index] as T,
});

function mockRolesReflectorSequence(
  mock: MockedReflectorGetAllAndOverride,
  options: {
    isPublic: boolean;
    uploadSessionSecretRoute?: boolean;
    requiredRoles?: readonly string[];
  },
): void {
  mockGetAllAndOverrideKeyMap(mock, [
    [IS_PUBLIC_KEY, options.isPublic],
    [
      IS_UPLOAD_SESSION_SECRET_ROUTE_KEY,
      options.uploadSessionSecretRoute ?? false,
    ],
    [ROLES_KEY, options.requiredRoles],
  ]);
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: createKeyedReflectorMock([
      [IS_PUBLIC_KEY, false],
      [IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, false],
      [ROLES_KEY, undefined],
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  describe('canActivate', () => {
    it('should allow request when no roles are required (open route)', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles: undefined,
      });

      const result = guard.canActivate(
        createExecutionContext({ id: 'user-1', role: 'DOCTOR' }),
      );

      expect(result).toBe(true);
    });

    it('should allow request when user has required role', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles: ['DOCTOR', 'ADMIN'],
      });

      const result = guard.canActivate(
        createExecutionContext({
          id: 'user-1',
          role: 'DOCTOR',
          clinicId: 'clinic-1',
        }),
      );

      expect(result).toBe(true);
    });

    it('should deny request when user lacks required role', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles: ['ADMIN'],
      });

      expect(() =>
        guard.canActivate(
          createExecutionContext({
            id: 'user-1',
            role: 'PATIENT',
            clinicId: 'clinic-1',
          }),
        ),
      ).toThrow();
    });

    it('should deny request when user is not authenticated', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles: ['DOCTOR'],
      });

      expect(() =>
        guard.canActivate(createExecutionContext(undefined)),
      ).toThrow();
    });

    it('allows upload-session-secret routes without an authenticated user', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        uploadSessionSecretRoute: true,
        requiredRoles: ['DOCTOR'],
      });

      const result = guard.canActivate(createExecutionContext(undefined));

      expect(result).toBe(true);
    });

    it('should handle multiple required roles', () => {
      const requiredRoles = ['DOCTOR', 'RECEPTIONIST', 'ADMIN'] as const;
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles,
      });

      const result = guard.canActivate(
        createExecutionContext({
          id: 'user-1',
          role: 'RECEPTIONIST',
          clinicId: 'clinic-1',
        }),
      );

      expect(result).toBe(true);
    });

    it('should reject superfluous roles not in required list', () => {
      mockRolesReflectorSequence(mockReflector.getAllAndOverride, {
        isPublic: false,
        requiredRoles: ['DOCTOR'],
      });

      expect(() =>
        guard.canActivate(
          createExecutionContext({
            id: 'user-1',
            role: 'INTERNAL',
            clinicId: 'clinic-1',
          }),
        ),
      ).toThrow();
    });
  });
});
