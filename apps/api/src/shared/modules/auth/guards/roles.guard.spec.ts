import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let _reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'DOCTOR' },
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow request when user has required role', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR', 'ADMIN']);

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'DOCTOR', clinicId: 'clinic-1' },
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny request when user lacks required role', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['ADMIN']);

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'PATIENT', clinicId: 'clinic-1' },
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow();
    });

    it('should deny request when user is not authenticated', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR']);

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: undefined,
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow();
    });

    it('should handle multiple required roles', () => {
      const requiredRoles = ['DOCTOR', 'NURSE', 'ADMIN'];
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(requiredRoles);

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'NURSE', clinicId: 'clinic-1' },
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should reject superfluous roles not in required list', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['DOCTOR']);

      const mockExecutionContext = {
        getHandler: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        getClass: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'SUPER_ADMIN', clinicId: 'clinic-1' },
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow();
    });
  });
});
