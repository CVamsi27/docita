import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RolesGuard } from '../auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

describe.skip('PaymentsController - Authorization', () => {
  let controller: PaymentsController;
  let rolesGuard: RolesGuard;

  const mockPaymentsService = {
    createPaymentLink: jest.fn(),
    sendPaymentLinkWhatsApp: jest.fn(),
    getPaymentSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: IdempotencyInterceptor,
          useValue: { intercept: jest.fn((context, next) => next.handle()) },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    rolesGuard = new RolesGuard(module.get<Reflector>(Reflector));
  });

  const createMockExecutionContext = (userRole: Role): ExecutionContext => {
    return {
      getHandler: () => controller.createPaymentLink,
      getClass: () => PaymentsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole, clinicId: 'clinic-123' },
        }),
      }),
    } as ExecutionContext;
  };

  describe('RolesGuard - PaymentsController', () => {
    it('should allow ADMIN to access payments endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow DOCTOR to access payments endpoints', () => {
      const context = createMockExecutionContext(Role.DOCTOR);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow RECEPTIONIST to access payments endpoints', () => {
      const context = createMockExecutionContext(Role.RECEPTIONIST);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN_DOCTOR to access payments endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN_DOCTOR);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny PHARMACIST access to payments endpoints', () => {
      const context = createMockExecutionContext(Role.PHARMACIST);
      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny NURSE access to payments endpoints', () => {
      const context = createMockExecutionContext(Role.NURSE);
      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny SUPER_ADMIN access to payments endpoints', () => {
      const context = createMockExecutionContext(Role.SUPER_ADMIN);
      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });

  describe('Controller endpoint structure', () => {
    it('should have @Roles decorator on controller class', () => {
      const roles = Reflect.getMetadata('roles', PaymentsController);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.DOCTOR);
      expect(roles).toContain(Role.RECEPTIONIST);
      expect(roles).toContain(Role.ADMIN_DOCTOR);
    });
  });
});
