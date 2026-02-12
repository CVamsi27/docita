import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { RolesGuard } from '../auth/roles.guard';
import { TierGuard } from '../auth/tier.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@workspace/db';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvoicesController - Authorization', () => {
  let controller: InvoicesController;
  let rolesGuard: RolesGuard;

  const mockInvoicesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    generatePDF: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
        {
          provide: TierGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: PrismaService,
          useValue: { clinic: { findUnique: jest.fn() } },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    rolesGuard = new RolesGuard(module.get<Reflector>(Reflector));
  });

  const createMockExecutionContext = (userRole: Role): ExecutionContext => {
    return {
      getHandler: () => controller.findAll,
      getClass: () => InvoicesController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole, clinicId: 'clinic-123' },
        }),
      }),
    } as ExecutionContext;
  };

  describe('RolesGuard - InvoicesController', () => {
    it('should allow ADMIN to access invoices endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow DOCTOR to access invoices endpoints', () => {
      const context = createMockExecutionContext(Role.DOCTOR);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow RECEPTIONIST to access invoices endpoints', () => {
      const context = createMockExecutionContext(Role.RECEPTIONIST);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN_DOCTOR to access invoices endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN_DOCTOR);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny PHARMACIST access to invoices endpoints', () => {
      const context = createMockExecutionContext(Role.PHARMACIST);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny NURSE access to invoices endpoints', () => {
      const context = createMockExecutionContext(Role.NURSE);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny SUPER_ADMIN access to invoices endpoints', () => {
      const context = createMockExecutionContext(Role.SUPER_ADMIN);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });
  });

  describe('Controller endpoint structure', () => {
    it('should have @Roles decorator on controller class', () => {
      const roles = Reflect.getMetadata('roles', InvoicesController);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.DOCTOR);
      expect(roles).toContain(Role.RECEPTIONIST);
      expect(roles).toContain(Role.ADMIN_DOCTOR);
    });
  });
});
