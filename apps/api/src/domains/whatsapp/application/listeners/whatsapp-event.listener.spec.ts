import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappEventListener } from './whatsapp-event.listener';
import { SystemEventsService } from '@/domains/whatsapp/application/services/system-events.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { Logger } from '@nestjs/common';
import { assertTenantQualifiedRead } from '@/test-utils/tenant-qualified-read';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { PaymentCapturedEvent } from '@/domains/billing/application/services/events/payment-captured.event';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { AppointmentUpdatedEvent } from '@/domains/appointments/application/events/appointment-updated.event';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
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
  const sendPrescriptionSystemMock =
    jest.fn<SystemEventsService['sendPrescriptionSystem']>();
  const sendInvoiceSystemMock =
    jest.fn<SystemEventsService['sendInvoiceSystem']>();
  const sendAppointmentConfirmationMock =
    jest.fn<SystemEventsService['sendAppointmentConfirmation']>();
  const sendAppointmentUpdateMock =
    jest.fn<SystemEventsService['sendAppointmentUpdate']>();
  const sendPaymentConfirmationMock =
    jest.fn<SystemEventsService['sendPaymentConfirmation']>();
  const notifyStaffMock = jest.fn<StaffNotificationService['notifyStaff']>();

  const mockSystemEventsService: Pick<
    SystemEventsService,
    | 'sendPrescriptionSystem'
    | 'sendInvoiceSystem'
    | 'sendAppointmentConfirmation'
    | 'sendAppointmentUpdate'
    | 'sendPaymentConfirmation'
  > = {
    sendPrescriptionSystem: sendPrescriptionSystemMock,
    sendInvoiceSystem: sendInvoiceSystemMock,
    sendAppointmentConfirmation: sendAppointmentConfirmationMock,
    sendAppointmentUpdate: sendAppointmentUpdateMock,
    sendPaymentConfirmation: sendPaymentConfirmationMock,
  };

  const paidInvoice = {
    total: 1500,
    patient: { firstName: 'Ada', lastName: 'Lovelace' },
  };
  const mockPersistence = {
    invoice: {
      findUnique: jest
        .fn<(args: unknown) => Promise<typeof paidInvoice | null>>()
        .mockImplementation(async (args: unknown) => {
          assertTenantQualifiedRead('Invoice', args, 'clinic-123');
          return paidInvoice;
        }),
    },
  };

  const createMockAppointment = (startTime: Date): Appointment => {
    const appointment = Object.create(Appointment.prototype) as Appointment;
    appointment.getStartTime = jest
      .fn<Appointment['getStartTime']>()
      .mockReturnValue(startTime);
    return appointment;
  };

  beforeEach(async () => {
    sendPrescriptionSystemMock.mockResolvedValue();
    sendInvoiceSystemMock.mockResolvedValue();
    sendAppointmentConfirmationMock.mockResolvedValue();
    sendAppointmentUpdateMock.mockResolvedValue();
    sendPaymentConfirmationMock.mockResolvedValue();
    notifyStaffMock.mockResolvedValue(undefined);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappEventListener,
        { provide: SystemEventsService, useValue: mockSystemEventsService },
        {
          provide: StaffNotificationService,
          useValue: { notifyStaff: notifyStaffMock },
        },
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPersistence },
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

      expect(
        mockSystemEventsService.sendPrescriptionSystem,
      ).toHaveBeenCalledWith('rx-123', 'clinic-123');
    });

    it('should catch and log errors without rethrowing', async () => {
      sendPrescriptionSystemMock.mockRejectedValue(
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

      expect(mockSystemEventsService.sendInvoiceSystem).toHaveBeenCalledWith(
        'inv-123',
        'clinic-123',
      );
    });

    it('should catch errors without rethrowing', async () => {
      sendInvoiceSystemMock.mockRejectedValue(new Error('Send failed'));
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
        appointment,
      );

      await listener.handleAppointmentCreated(event);

      expect(
        mockSystemEventsService.sendAppointmentConfirmation,
      ).toHaveBeenCalledWith('appt-123', 'clinic-123');
    });

    it('should catch errors without rethrowing', async () => {
      sendAppointmentConfirmationMock.mockRejectedValue(
        new Error('Confirmation failed'),
      );
      const appointment = createMockAppointment(new Date());
      const event = new AppointmentCreatedEvent(
        'appt-fail',
        'clinic-123',
        'patient-123',
        appointment,
      );

      await expect(
        listener.handleAppointmentCreated(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handlePaymentCaptured', () => {
    it('does not create a staff notification for an absent invoice', async () => {
      mockPersistence.invoice.findUnique.mockResolvedValueOnce(null);
      await listener.handlePaymentCaptured(
        new PaymentCapturedEvent(
          'invoice-missing',
          'clinic-123',
          'pay-1',
          50000,
        ),
      );
      expect(notifyStaffMock).not.toHaveBeenCalled();
    });

    it('should send payment confirmation and notify staff at LOW priority', async () => {
      const event = new PaymentCapturedEvent(
        'inv-pay-123',
        'clinic-123',
        'pay_razorpay_1',
        150000,
      );

      await listener.handlePaymentCaptured(event);

      expect(
        mockSystemEventsService.sendPaymentConfirmation,
      ).toHaveBeenCalledWith('inv-pay-123', 'clinic-123');
      expect(notifyStaffMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-123',
          type: 'INVOICE_PAID',
          priority: 'LOW',
          sendInApp: true,
          sendWhatsApp: false,
          title: 'Payment received',
        }),
      );
    });

    it('should catch WhatsApp errors without blocking staff notification', async () => {
      sendPaymentConfirmationMock.mockRejectedValue(new Error('WhatsApp down'));
      const event = new PaymentCapturedEvent(
        'inv-fail',
        'clinic-123',
        'pay_1',
        10000,
      );

      await expect(
        listener.handlePaymentCaptured(event),
      ).resolves.not.toThrow();
      expect(notifyStaffMock).toHaveBeenCalled();
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
        appointment,
        undefined,
      );

      await listener.handleAppointmentUpdated(event);

      expect(
        mockSystemEventsService.sendAppointmentUpdate,
      ).toHaveBeenCalledWith('appt-123', 'clinic-123', 'CANCELLED');
    });

    it('should call sendAppointmentUpdate with CANCELLED when status is "no-show"', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'no-show',
        'SCHEDULED',
        appointment,
        undefined,
      );

      await listener.handleAppointmentUpdated(event);

      expect(
        mockSystemEventsService.sendAppointmentUpdate,
      ).toHaveBeenCalledWith('appt-123', 'clinic-123', 'CANCELLED');
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
        appointment,
        oldStartTime,
      );

      await listener.handleAppointmentUpdated(event);

      expect(
        mockSystemEventsService.sendAppointmentUpdate,
      ).toHaveBeenCalledWith('appt-123', 'clinic-123', 'RESCHEDULED');
    });

    it('should do nothing when status unchanged and start time unchanged', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-123',
        'clinic-123',
        'CONFIRMED',
        'SCHEDULED',
        appointment,
        startTime,
      );

      await listener.handleAppointmentUpdated(event);

      expect(
        mockSystemEventsService.sendAppointmentUpdate,
      ).not.toHaveBeenCalled();
    });

    it('should catch errors without rethrowing', async () => {
      sendAppointmentUpdateMock.mockRejectedValue(new Error('Update failed'));
      const startTime = new Date('2026-04-01T10:00:00Z');
      const appointment = createMockAppointment(startTime);
      const event = new AppointmentUpdatedEvent(
        'appt-fail',
        'clinic-123',
        'cancelled',
        'SCHEDULED',
        appointment,
        undefined,
      );

      await expect(
        listener.handleAppointmentUpdated(event),
      ).resolves.not.toThrow();
    });
  });
});
