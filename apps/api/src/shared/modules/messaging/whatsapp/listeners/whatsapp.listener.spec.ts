import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappEventListener } from './whatsapp.listener';
import { WhatsappService } from '@/shared/modules/messaging/whatsapp/whatsapp.service';
import { Logger } from '@nestjs/common';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { AppointmentUpdatedEvent } from '@/domains/appointments/application/events/appointment-updated.event';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('WhatsappEventListener', () => {
  let listener: WhatsappEventListener;
  let mockWhatsappService: {
    sendPrescriptionSystem: ReturnType<typeof jest.fn>;
    sendInvoiceSystem: ReturnType<typeof jest.fn>;
    sendAppointmentConfirmation: ReturnType<typeof jest.fn>;
    sendAppointmentUpdate: ReturnType<typeof jest.fn>;
  };

  function createMockAppointment(startTime: Date) {
    return {
      getStartTime: jest.fn().mockReturnValue(startTime),
    };
  }

  beforeEach(async () => {
    mockWhatsappService = {
      sendPrescriptionSystem: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
      sendInvoiceSystem: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
      sendAppointmentConfirmation: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
      sendAppointmentUpdate: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappEventListener,
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    listener = module.get<WhatsappEventListener>(WhatsappEventListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handlePrescriptionCreated', () => {
    it('should call sendPrescriptionSystem with correct args', async () => {
      const event = {
        prescriptionId: 'rx-123',
        clinicId: 'clinic-123',
      } as PrescriptionCreatedEvent;

      await listener.handlePrescriptionCreated(event);

      expect(mockWhatsappService.sendPrescriptionSystem).toHaveBeenCalledWith(
        'rx-123',
        'clinic-123',
      );
    });

    it('should catch and log errors without rethrowing', async () => {
      mockWhatsappService.sendPrescriptionSystem.mockRejectedValue(
        new Error('WhatsApp failed'),
      );
      const event = {
        prescriptionId: 'rx-fail',
        clinicId: 'clinic-123',
      } as PrescriptionCreatedEvent;

      await expect(
        listener.handlePrescriptionCreated(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handleInvoiceGenerated', () => {
    it('should call sendInvoiceSystem with correct args', async () => {
      const event = {
        invoiceId: 'inv-123',
        clinicId: 'clinic-123',
      } as InvoiceGeneratedEvent;

      await listener.handleInvoiceGenerated(event);

      expect(mockWhatsappService.sendInvoiceSystem).toHaveBeenCalledWith(
        'inv-123',
        'clinic-123',
      );
    });

    it('should catch errors without rethrowing', async () => {
      mockWhatsappService.sendInvoiceSystem.mockRejectedValue(
        new Error('Send failed'),
      );
      const event = {
        invoiceId: 'inv-fail',
        clinicId: 'clinic-123',
      } as InvoiceGeneratedEvent;

      await expect(
        listener.handleInvoiceGenerated(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handleAppointmentCreated', () => {
    it('should call sendAppointmentConfirmation with correct args', async () => {
      const appointment = createMockAppointment(new Date());
      const event = new AppointmentCreatedEvent(
        'appt-123',
        'clinic-123',
        'patient-123',
        appointment as never,
      );

      await listener.handleAppointmentCreated(event);

      expect(
        mockWhatsappService.sendAppointmentConfirmation,
      ).toHaveBeenCalledWith('appt-123', 'clinic-123');
    });

    it('should catch errors without rethrowing', async () => {
      mockWhatsappService.sendAppointmentConfirmation.mockRejectedValue(
        new Error('Confirmation failed'),
      );
      const appointment = createMockAppointment(new Date());
      const event = new AppointmentCreatedEvent(
        'appt-fail',
        'clinic-123',
        'patient-123',
        appointment as never,
      );

      await expect(
        listener.handleAppointmentCreated(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handleAppointmentUpdated', () => {
    it('should call sendAppointmentUpdate with CANCELLED when status is "cancelled"', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'cancelled',
        'SCHEDULED',
        appointment as never,
        undefined,
      );

      await listener.handleAppointmentUpdated(event);

      expect(mockWhatsappService.sendAppointmentUpdate).toHaveBeenCalledWith(
        'appt-123',
        'clinic-123',
        'CANCELLED',
      );
    });

    it('should call sendAppointmentUpdate with CANCELLED when status is "no-show"', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'no-show',
        'SCHEDULED',
        appointment as never,
        undefined,
      );

      await listener.handleAppointmentUpdated(event);

      expect(mockWhatsappService.sendAppointmentUpdate).toHaveBeenCalledWith(
        'appt-123',
        'clinic-123',
        'CANCELLED',
      );
    });

    it('should call sendAppointmentUpdate with RESCHEDULED when startTime changed', async () => {
      const oldStartTime = new Date('2026-04-01T10:00:00Z');
      const newStartTime = new Date('2026-04-02T10:00:00Z');
      const appointment = createMockAppointment(newStartTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'SCHEDULED',
        'SCHEDULED',
        appointment as never,
        oldStartTime,
      );

      await listener.handleAppointmentUpdated(event);

      expect(mockWhatsappService.sendAppointmentUpdate).toHaveBeenCalledWith(
        'appt-123',
        'clinic-123',
        'RESCHEDULED',
      );
    });

    it('should do nothing when status unchanged and start time unchanged', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'CONFIRMED',
        'SCHEDULED',
        appointment as never,
        startTime,
      );

      await listener.handleAppointmentUpdated(event);

      expect(mockWhatsappService.sendAppointmentUpdate).not.toHaveBeenCalled();
    });

    it('should catch errors without rethrowing', async () => {
      mockWhatsappService.sendAppointmentUpdate.mockRejectedValue(
        new Error('Update failed'),
      );
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-fail',
        'clinic-123',
        'cancelled',
        'SCHEDULED',
        appointment as never,
        undefined,
      );

      await expect(
        listener.handleAppointmentUpdated(event),
      ).resolves.not.toThrow();
    });
  });
});
