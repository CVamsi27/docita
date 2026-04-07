import { Test, TestingModule } from '@nestjs/testing';
import { ContextType, ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
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

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let _reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
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
    _reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow request when no roles are required (open route)', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(undefined);

      const result = guard.canActivate(
        createExecutionContext({ id: 'user-1', role: 'DOCTOR' }),
      );

      expect(result).toBe(true);
    });

    it('should allow request when user has required role', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR', 'ADMIN']);

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
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['ADMIN']);

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
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR']);

      expect(() =>
        guard.canActivate(createExecutionContext(undefined)),
      ).toThrow();
    });

    it('should handle multiple required roles', () => {
      const requiredRoles = ['DOCTOR', 'RECEPTIONIST', 'ADMIN'];
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(requiredRoles);

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
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR']);

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
