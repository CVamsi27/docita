import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    get: jest.fn(),
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
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow request when no roles are required', () => {
      mockReflector.get.mockReturnValueOnce(undefined); // No roles required

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'DOCTOR' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow request when user has required role', () => {
      mockReflector.get.mockReturnValueOnce(['DOCTOR', 'ADMIN']);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'DOCTOR', clinicId: 'clinic-1' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny request when user lacks required role', () => {
      mockReflector.get.mockReturnValueOnce(['ADMIN']);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'PATIENT', clinicId: 'clinic-1' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should deny request when user is not authenticated', () => {
      mockReflector.get.mockReturnValueOnce(['DOCTOR']);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: undefined,
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle multiple required roles', () => {
      const requiredRoles = ['DOCTOR', 'NURSE', 'ADMIN'];
      mockReflector.get.mockReturnValueOnce(requiredRoles);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'NURSE', clinicId: 'clinic-1' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should reject superfluous roles not in required list', () => {
      mockReflector.get.mockReturnValueOnce(['DOCTOR']);

      const mockExecutionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-1', role: 'SUPER_ADMIN', clinicId: 'clinic-1' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });
});
