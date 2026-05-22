import { Test, TestingModule } from '@nestjs/testing';
import { InternalAnalyticsController } from './internal-analytics.controller';
import { ClinicManagementService } from './clinic-management.service';
import { InternalAnalyticsService } from './internal-analytics.service';
import { InternalLogService } from './internal-log.service';
import { InternalAiService } from './internal-ai.service';
import { InternalBillingService } from './internal-billing.service';
import { FeedbackService } from '@/domains/feedback/application/services/feedback.service';
import { ContactService } from '@/shared/modules/contact/contact.service';
import { SupportWhatsAppInboxService } from '@/shared/modules/support-whatsapp';
import { WhatsAppBroadcastService } from '@/shared/modules/whatsapp-broadcast';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Role } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('Internal controllers - Authorization', () => {
  let controller: InternalAnalyticsController;
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

  const mockFeedbackService = {
    findAll: jest.fn(),
    getStats: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const mockContactService = {
    listInquiries: jest.fn(),
    submitInquiry: jest.fn(),
  };

  const mockSupportWhatsAppInboxService = {
    listMessages: jest.fn(),
    recordIncomingMessages: jest.fn(),
  };

  const mockWhatsAppBroadcastService = {
    createBroadcast: jest.fn(),
    listJobs: jest.fn(),
    getJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAnalyticsController],
      providers: [
        {
          provide: ClinicManagementService,
          useValue: mockClinicManagementService,
        },
        {
          provide: InternalAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: InternalLogService,
          useValue: mockLogService,
        },
        {
          provide: InternalAiService,
          useValue: mockAiService,
        },
        {
          provide: InternalBillingService,
          useValue: mockBillingService,
        },
        {
          provide: FeedbackService,
          useValue: mockFeedbackService,
        },
        {
          provide: ContactService,
          useValue: mockContactService,
        },
        {
          provide: SupportWhatsAppInboxService,
          useValue: mockSupportWhatsAppInboxService,
        },
        {
          provide: WhatsAppBroadcastService,
          useValue: mockWhatsAppBroadcastService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<InternalAnalyticsController>(
      InternalAnalyticsController,
    );
    rolesGuard = new RolesGuard(module.get<Reflector>(Reflector), {
      getInternalAllowedEmails: () => [],
    } as never);
  });

  const createMockExecutionContext = (userRole: Role): ExecutionContext => {
    const request = {
      user: {
        role: userRole,
        clinicId: 'clinic-123',
        email: 'admin@docita.work',
      },
    };
    const context = new ExecutionContextHost(
      [request, undefined, undefined],
      InternalAnalyticsController,
      controller.getGlobalStats,
    );
    context.setType('http');
    return context;
  };

  describe('RolesGuard - internal endpoints', () => {
    it('should allow INTERNAL to access internal endpoints', () => {
      const context = createMockExecutionContext(Role.INTERNAL);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny ADMIN access to internal endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny DOCTOR access to internal endpoints', () => {
      const context = createMockExecutionContext(Role.DOCTOR);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny RECEPTIONIST access to internal endpoints', () => {
      const context = createMockExecutionContext(Role.RECEPTIONIST);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny ADMIN_DOCTOR access to internal endpoints', () => {
      const context = createMockExecutionContext(Role.ADMIN_DOCTOR);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });

    it('should deny PATIENT access to internal endpoints', () => {
      const context = createMockExecutionContext(Role.PATIENT);
      expect(() => rolesGuard.canActivate(context)).toThrow();
    });
  });

  describe('Controller endpoint structure', () => {
    it('should have @Roles(INTERNAL) decorator on controller class', () => {
      const roles = Reflect.getMetadata('roles', InternalAnalyticsController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([Role.INTERNAL]);
    });
  });
});
