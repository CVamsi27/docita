import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminController } from './super-admin.controller';
import { ClinicManagementService } from './clinic-management.service';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdminLogService } from './super-admin-log.service';
import { SuperAdminAiService } from './super-admin-ai.service';
import { SuperAdminBillingService } from './super-admin-billing.service';
import { RolesGuard } from '../auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@workspace/db';

describe('SuperAdminController - Authorization', () => {
  let controller: SuperAdminController;
  let rolesGuard: RolesGuard;

  const mockClinicManagementService = {
    getAllClinics: jest.fn(),
    createClinic: jest.fn(),
    updateClinic: jest.fn(),
  };

  const mockAnalyticsService = {
    getGlobalStats: jest.fn(),
  };

  const mockLogService = {
    getRecentLogs: jest.fn(),
  };

  const mockAiService = {
    getFeatureCatalog: jest.fn(),
  };

  const mockBillingService = {
    getTierPricing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        {
          provide: ClinicManagementService,
          useValue: mockClinicManagementService,
        },
        {
          provide: SuperAdminAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: SuperAdminLogService,
          useValue: mockLogService,
        },
        {
          provide: SuperAdminAiService,
          useValue: mockAiService,
        },
        {
          provide: SuperAdminBillingService,
          useValue: mockBillingService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
    rolesGuard = new RolesGuard(module.get<Reflector>(Reflector));
  });

  const createMockExecutionContext = (userRole: Role): ExecutionContext => {
    return {
      getHandler: () => controller.getGlobalStats,
      getClass: () => SuperAdminController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole, clinicId: 'clinic-123' },
        }),
      }),
    } as ExecutionContext;
  };

  describe('RolesGuard - SuperAdminController', () => {
    it('should allow SUPER_ADMIN to access super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.SUPER_ADMIN);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny ADMIN access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny DOCTOR access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.DOCTOR);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny RECEPTIONIST access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.RECEPTIONIST);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny ADMIN_DOCTOR access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN_DOCTOR);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny PHARMACIST access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.PHARMACIST);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny NURSE access to super-admin endpoints', () => {
      const context = createMockExecutionContext(Role.NURSE);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });
  });

  describe('Controller endpoint structure', () => {
    it('should have @Roles(SUPER_ADMIN) decorator on controller class', () => {
      const roles = Reflect.getMetadata('roles', SuperAdminController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.SUPER_ADMIN]);
    });
  });
});
