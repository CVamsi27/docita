import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let _prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      deviceToken: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendToPatient', () => {
    it('should log notification and return success', async () => {
      const result = await service.sendToPatient(
        'patient-1',
        {
          title: 'Test Title',
          body: 'Test body message',
          data: { key: 'value' },
        },
        'payment_received',
      );

      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const result = await service.sendToPatient(
        'patient-1',
        {
          title: 'Test',
          body: 'Test',
        },
        'general',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendToUser', () => {
    it('should log notification for staff/doctor', async () => {
      const result = await service.sendToUser(
        'user-1',
        {
          title: 'Staff Notification',
          body: 'New patient response',
        },
        'appointment_confirmed',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation notification', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendPaymentConfirmation(
        'patient-1',
        1500.5,
        'INV12345',
        'Test Clinic',
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          title: 'Payment Received',
          body: expect.stringContaining('1500.50'),
          data: expect.objectContaining({
            invoiceNumber: 'INV12345',
            clinicName: 'Test Clinic',
          }),
        }),
        'payment_received',
      );
    });

    it('should format amount with 2 decimal places', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendPaymentConfirmation(
        'patient-1',
        999.9,
        'INV001',
        'Clinic',
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          body: expect.stringContaining('999.90'),
        }),
        'payment_received',
      );
    });
  });

  describe('sendPaymentFailed', () => {
    it('should send payment failed notification', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendPaymentFailed(
        'patient-1',
        500,
        'INV54341',
        'Health Clinic',
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          title: 'Payment Failed',
          body: expect.stringContaining('could not be processed'),
          data: expect.objectContaining({
            amount: '500',
          }),
        }),
        'payment_failed',
      );
    });
  });

  describe('sendPaymentReminder', () => {
    it('should send payment reminder with link', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendPaymentReminder(
        'patient-1',
        750,
        'INV99999',
        'Medical Center',
        'https://docita.com/invoice/INV99999',
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          title: 'Payment Reminder',
          body: expect.stringContaining('750.00 due'),
          data: expect.objectContaining({
            paymentLink: 'https://docita.com/invoice/INV99999',
          }),
        }),
        'payment_reminder',
      );
    });
  });

  describe('sendInvoiceReady', () => {
    it('should send invoice ready notification with payment link', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendInvoiceReady(
        'patient-1',
        2000,
        'INV11111',
        'City Hospital',
        'https://docita.com/invoice/INV11111',
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          title: 'Invoice Ready',
          body: expect.stringContaining('2000.00'),
          data: expect.objectContaining({
            paymentLink: 'https://docita.com/invoice/INV11111',
          }),
        }),
        'invoice_ready',
      );
    });

    it('should handle missing payment link', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendInvoiceReady(
        'patient-1',
        1000,
        'INV22222',
        'Clinic',
        undefined,
      );

      expect(sendToPatientSpy).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          data: expect.objectContaining({
            paymentLink: '',
          }),
        }),
        'invoice_ready',
      );
    });
  });

  describe('notification types', () => {
    it('should use correct type for payment notifications', async () => {
      const sendToPatientSpy = jest.spyOn(service, 'sendToPatient');

      await service.sendPaymentConfirmation('p1', 100, 'INV1', 'C1');
      expect(sendToPatientSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Object),
        'payment_received',
      );

      await service.sendPaymentFailed('p1', 100, 'INV1', 'C1');
      expect(sendToPatientSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Object),
        'payment_failed',
      );

      await service.sendPaymentReminder('p1', 100, 'INV1', 'C1', 'link');
      expect(sendToPatientSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Object),
        'payment_reminder',
      );

      await service.sendInvoiceReady('p1', 100, 'INV1', 'C1');
      expect(sendToPatientSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Object),
        'invoice_ready',
      );
    });
  });
});
