import { Test, TestingModule } from '@nestjs/testing';
import { StaffNotificationService } from './staff-notification.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { WhatsappClientService } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.service';
import { TemplateResolutionService } from '@/shared/whatsapp/template-resolution.service';
import { TemplateModeService } from '@/shared/whatsapp/template-mode.service';
import { StaffNotificationRecipientResolver } from './staff-notification-recipient.resolver';
import { StaffNotificationPolicyService } from './staff-notification-policy.service';
import { StaffNotificationWhatsAppDispatchService } from './staff-notification-whatsapp-dispatch.service';
import { StaffNotificationInboxService } from './staff-notification-inbox.service';
import { NOTIFICATION_RECIPIENT_RESOLVER_TOKEN } from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';
import { Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import { ClinicTier } from '@workspace/db';

describe('StaffNotificationService', () => {
  let service: StaffNotificationService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  let mockWhatsappClient: { sendTextMessage: ReturnType<typeof jest.fn> };
  let mockTemplateResolution: {
    resolveTemplate: ReturnType<typeof jest.fn>;
  };
  let mockTemplateMode: {
    getMessageForMode: ReturnType<typeof jest.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof jest.fn> };

  function buildMockPrisma() {
    return {
      clinic: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'clinic-123',
            tier: ClinicTier.ESSENTIAL,
            whatsappAutomation: { enabled: true },
          })),
      },
      user: {
        findMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => [
            { id: 'user-1', phoneNumber: '+919876543210' },
            { id: 'user-2', phoneNumber: null },
          ]),
      },
      staffNotification: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'notif-123',
            clinicId: 'clinic-123',
            userId: 'user-1',
            type: 'PATIENT_RESPONSE',
            title: 'Test',
            message: 'Test message',
            data: '{}',
            priority: 'NORMAL',
            isRead: false,
            readAt: null,
            deletedAt: null,
            createdAt: new Date(),
          })),
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => []),
        updateMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({ count: 1 })),
        count: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => 5),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();
    mockWhatsappClient = {
      sendTextMessage: jest.fn().mockImplementation(async () => ({
        success: true,
        messageId: 'msg-123',
      })),
    };
    mockTemplateResolution = {
      resolveTemplate: jest.fn().mockImplementation(async () => null),
    };
    mockTemplateMode = {
      getMessageForMode: jest.fn().mockReturnValue('Formatted message'),
    };
    mockEventEmitter = {
      emit: jest.fn(),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffNotificationService,
        StaffNotificationRecipientResolver,
        {
          provide: NOTIFICATION_RECIPIENT_RESOLVER_TOKEN,
          useExisting: StaffNotificationRecipientResolver,
        },
        StaffNotificationPolicyService,
        StaffNotificationWhatsAppDispatchService,
        StaffNotificationInboxService,
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPrisma },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        {
          provide: TemplateResolutionService,
          useValue: mockTemplateResolution,
        },
        { provide: TemplateModeService, useValue: mockTemplateMode },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-01-15T10:00:00Z') },
        },
      ],
    }).compile();

    service = module.get<StaffNotificationService>(StaffNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyStaff', () => {
    it('should create in-app notifications for all recipients', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Patient Response',
        message: 'Patient confirmed appointment',
      });

      expect(mockPrisma.staffNotification.create).toHaveBeenCalledTimes(2);
    });

    it('should send WhatsApp only to recipients with a phone number', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Patient Response',
        message: 'Patient confirmed appointment',
        sendWhatsApp: true,
      });

      expect(mockWhatsappClient.sendTextMessage).toHaveBeenCalledTimes(1);
      expect(mockWhatsappClient.sendTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+919876543210' }),
      );
    });

    it('should skip WhatsApp when clinic has whatsappAutomation disabled', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.ESSENTIAL,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Test',
        message: 'Test',
        sendWhatsApp: true,
      });

      expect(mockWhatsappClient.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should skip WhatsApp when sendWhatsApp=false', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Test',
        message: 'Test',
        sendWhatsApp: false,
      });

      expect(mockWhatsappClient.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should emit notification.created event for each in-app notification', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Test',
        message: 'Test',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ApplicationEvents.NOTIFICATION_CREATED,
        expect.objectContaining({ clinicId: 'clinic-123' }),
      );
    });

    it('should log warning and return when no recipients found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Test',
        message: 'Test',
      });

      expect(mockPrisma.staffNotification.create).not.toHaveBeenCalled();
    });
  });

  describe('getRecipients role routing', () => {
    it('should query RECEPTIONIST, ADMIN, ADMIN_DOCTOR roles for PATIENT_RESPONSE', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PATIENT_RESPONSE',
        title: 'Test',
        message: 'Test',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinicId: 'clinic-123',
          role: { in: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'] },
        }),
        select: { id: true, phoneNumber: true },
      });
    });

    it('should include DOCTOR role for APPOINTMENT_CANCEL type', async () => {
      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'APPOINTMENT_CANCEL',
        title: 'Appointment Cancelled',
        message: 'Patient cancelled',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          role: { in: expect.arrayContaining(['DOCTOR']) },
        }),
        select: { id: true, phoneNumber: true },
      });
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return unread, non-deleted notifications', async () => {
      const now = new Date();
      mockPrisma.staffNotification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          clinicId: 'clinic-123',
          userId: 'user-1',
          type: 'PATIENT_RESPONSE',
          title: 'Test',
          message: 'Test',
          data: '{"key":"value"}',
          priority: 'NORMAL',
          isRead: false,
          readAt: null,
          deletedAt: null,
          createdAt: now,
        },
      ]);

      const result = await service.getUnreadNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].data).toEqual({ key: 'value' });
    });

    it('should respect the limit parameter', async () => {
      await service.getUnreadNotifications('user-1', 5);

      expect(mockPrisma.staffNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('getAllNotifications', () => {
    it('returns read + unread, excluding soft-deleted, ordered by createdAt desc', async () => {
      const now = new Date();
      mockPrisma.staffNotification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          clinicId: 'clinic-123',
          userId: 'user-1',
          type: 'PATIENT_RESPONSE',
          title: 'Test',
          message: 'Test',
          data: '{"key":"value"}',
          priority: 'NORMAL',
          isRead: true,
          readAt: now,
          deletedAt: null,
          createdAt: now,
        },
        {
          id: 'notif-2',
          clinicId: 'clinic-123',
          userId: 'user-1',
          type: 'INVOICE_PENDING',
          title: 'Test',
          message: 'Test',
          data: '{}',
          priority: 'NORMAL',
          isRead: false,
          readAt: null,
          deletedAt: null,
          createdAt: now,
        },
      ]);

      const result = await service.getAllNotifications('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.staffNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
    });

    it('respects limit and offset options', async () => {
      mockPrisma.staffNotification.findMany.mockResolvedValue([]);

      await service.getAllNotifications('user-1', { limit: 25, offset: 50 });

      expect(mockPrisma.staffNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 50 }),
      );
    });

    it('uses default limit/offset when none provided', async () => {
      mockPrisma.staffNotification.findMany.mockResolvedValue([]);

      await service.getAllNotifications('user-1');

      expect(mockPrisma.staffNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 }),
      );
    });
  });

  describe('markNotificationRead', () => {
    it('should mark a notification as read and emit event', async () => {
      mockPrisma.staffNotification.findFirst.mockResolvedValue({
        clinicId: 'clinic-123',
      });

      await service.markNotificationRead('notif-123', 'user-1');

      expect(mockPrisma.staffNotification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-1', deletedAt: null },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.read',
        expect.objectContaining({ notificationId: 'notif-123' }),
      );
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrisma.staffNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markNotificationRead('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNotification', () => {
    it('should soft-delete a notification via deletedAt', async () => {
      mockPrisma.staffNotification.findFirst.mockResolvedValue({
        clinicId: 'clinic-123',
      });

      await service.deleteNotification('notif-123', 'user-1');

      expect(mockPrisma.staffNotification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.deleted',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrisma.staffNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAllNotifications', () => {
    it('should soft-delete all notifications for a user and emit event', async () => {
      await service.deleteAllNotifications('user-1', 'clinic-123');

      expect(mockPrisma.staffNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.bulk-deleted',
        { clinicId: 'clinic-123', userId: 'user-1' },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread non-deleted notifications', async () => {
      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrisma.staffNotification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false, deletedAt: null },
      });
    });
  });

  describe('tier gating', () => {
    it('skips INVOICE_PENDING for clinics below ESSENTIAL', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.STARTER,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'INVOICE_PENDING',
        title: 't',
        message: 'm',
      });

      expect(mockPrisma.staffNotification.create).not.toHaveBeenCalled();
    });

    it('delivers INVOICE_PENDING for clinics on ESSENTIAL or above', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.ESSENTIAL,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'INVOICE_PENDING',
        title: 't',
        message: 'm',
      });

      expect(mockPrisma.staffNotification.create).toHaveBeenCalled();
    });

    it('skips PAYMENT_PROVIDER_STATUS_UPDATE below PROFESSIONAL', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.ESSENTIAL,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'PAYMENT_PROVIDER_STATUS_UPDATE',
        title: 't',
        message: 'm',
      });

      expect(mockPrisma.staffNotification.create).not.toHaveBeenCalled();
    });

    it('delivers types without a tier requirement at any tier', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.STARTER,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'APPOINTMENT_REQUEST_CREATED',
        title: 't',
        message: 'm',
      });

      expect(mockPrisma.staffNotification.create).toHaveBeenCalled();
    });

    it('treats FRONT_DESK as STARTER-equivalent for ordering', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        tier: ClinicTier.FRONT_DESK,
        whatsappAutomation: { enabled: false },
      });

      await service.notifyStaff({
        clinicId: 'clinic-123',
        type: 'INVOICE_PENDING',
        title: 't',
        message: 'm',
      });

      expect(mockPrisma.staffNotification.create).not.toHaveBeenCalled();
    });
  });

  describe('sendApprovalRequest', () => {
    it('should call notifyStaff with PRESCRIPTION_PENDING type', async () => {
      const notifyStaffSpy = jest
        .spyOn(service, 'notifyStaff')
        .mockResolvedValue();

      await service.sendApprovalRequest(
        'clinic-123',
        'prescription',
        'rx-123',
        'John Doe',
        'Dr. Smith',
      );

      expect(notifyStaffSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PRESCRIPTION_PENDING' }),
      );
    });

    it('should call notifyStaff with INVOICE_PENDING type for invoice', async () => {
      const notifyStaffSpy = jest
        .spyOn(service, 'notifyStaff')
        .mockResolvedValue();

      await service.sendApprovalRequest(
        'clinic-123',
        'invoice',
        'inv-123',
        'Jane Doe',
        'Dr. Smith',
      );

      expect(notifyStaffSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INVOICE_PENDING' }),
      );
    });
  });
});
