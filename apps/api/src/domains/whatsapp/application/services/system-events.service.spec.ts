import { Test, TestingModule } from '@nestjs/testing';
import { SystemEventsService } from './system-events.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { Logger } from '@nestjs/common';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';

describe('SystemEventsService', () => {
  let service: SystemEventsService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  const sendMessageExecute = jest.fn<SendMessageUseCase['execute']>();

  function essentialClinic(overrides: Record<string, unknown> = {}) {
    return {
      tier: ClinicTier.ESSENTIAL,
      intelligenceAddon: IntelligenceAddon.NONE,
      features: {},
      whatsappAutomation: { enabled: true },
      ...overrides,
    };
  }

  function buildMockPrisma() {
    return {
      clinic: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => essentialClinic()),
      },
      prescription: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'rx-123',
            patient: {
              firstName: 'Rahul',
              lastName: 'Sharma',
              phoneNumber: '919876543210',
            },
            doctor: { name: 'Dr. Patel' },
            appointment: { clinic: { name: 'Test Clinic' } },
          })),
      },
      invoice: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'inv-123',
            total: 1500,
            patient: {
              firstName: 'Meera',
              lastName: 'Nair',
              phoneNumber: '919876543211',
            },
            appointment: { clinic: { name: 'Test Clinic' } },
          })),
      },
      appointment: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'appt-123',
            startTime: new Date('2026-04-01T10:00:00Z'),
            patient: {
              firstName: 'Sunita',
              lastName: 'Devi',
              phoneNumber: '919876543212',
            },
            doctor: { name: 'Dr. Sharma' },
            clinic: {
              name: 'Test Clinic',
              settings: {
                mapsLocation: { lat: 12.9716, lng: 77.5946 },
              },
            },
          })),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();
    sendMessageExecute.mockResolvedValue({
      messageId: 'msg-int',
      providerMessageId: 'wamid.1',
    });

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemEventsService,
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPrisma },
        {
          provide: SendMessageUseCase,
          useValue: { execute: sendMessageExecute },
        },
      ],
    }).compile();

    service = module.get<SystemEventsService>(SystemEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPrescriptionSystem', () => {
    it('should send prescription_created via SendMessageUseCase', async () => {
      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockPrisma.prescription.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rx-123' } }),
      );
      expect(sendMessageExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-123',
          recipientPhone: '919876543210',
          templateName: 'prescription_created',
          variables: expect.objectContaining({
            patientName: 'Rahul Sharma',
            doctorName: 'Dr. Patel',
            clinicName: 'Test Clinic',
          }),
        }),
      );
    });

    it('should skip when WhatsApp automation is disabled for clinic', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue(
        essentialClinic({ whatsappAutomation: { enabled: false } }),
      );

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockPrisma.prescription.findUnique).not.toHaveBeenCalled();
      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when clinic tier is Starter', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        tier: ClinicTier.STARTER,
        intelligenceAddon: IntelligenceAddon.NONE,
        features: {},
        whatsappAutomation: { enabled: true },
      });

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when prescription is not found', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(null);

      await service.sendPrescriptionSystem('nonexistent', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when patient has no phone number', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-123',
        patient: { firstName: 'Test', lastName: 'Patient', phoneNumber: null },
        doctor: { name: 'Dr. Patel' },
        appointment: { clinic: { name: 'Test Clinic' } },
      });

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });
  });

  describe('sendInvoiceSystem', () => {
    it('should send invoice_created via SendMessageUseCase', async () => {
      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-123' } }),
      );
      expect(sendMessageExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'invoice_created',
          recipientPhone: '919876543211',
        }),
      );
    });

    it('should skip when WhatsApp is disabled for clinic', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue(
        essentialClinic({ whatsappAutomation: { enabled: false } }),
      );

      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when invoice is not found', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await service.sendInvoiceSystem('nonexistent', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when patient has no phone number', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-123',
        total: 1500,
        patient: { firstName: 'Test', lastName: 'Patient', phoneNumber: null },
        appointment: { clinic: { name: 'Test Clinic' } },
      });

      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentConfirmation', () => {
    it('should send appointment_confirmation template', async () => {
      await service.sendAppointmentConfirmation('appt-123', 'clinic-123');

      expect(sendMessageExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'appointment_confirmation',
          recipientPhone: '919876543212',
          variables: expect.objectContaining({
            patientName: 'Sunita Devi',
            clinicName: 'Test Clinic',
            doctorName: 'Dr. Sharma',
            mapsLink: 'https://www.google.com/maps?q=12.9716,77.5946',
          }),
        }),
      );
    });

    it('should skip when appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await service.sendAppointmentConfirmation('nonexistent', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });

    it('should skip when WhatsApp is disabled', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue(
        essentialClinic({ whatsappAutomation: { enabled: false } }),
      );

      await service.sendAppointmentConfirmation('appt-123', 'clinic-123');

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentUpdate', () => {
    it('should send appointment_cancelled template for CANCELLED type', async () => {
      await service.sendAppointmentUpdate(
        'appt-123',
        'clinic-123',
        'CANCELLED',
      );

      expect(sendMessageExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'appointment_cancelled',
        }),
      );
    });

    it('should send appointment_rescheduled template for RESCHEDULED type', async () => {
      await service.sendAppointmentUpdate(
        'appt-123',
        'clinic-123',
        'RESCHEDULED',
      );

      expect(sendMessageExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'appointment_rescheduled',
        }),
      );
    });

    it('should skip when appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await service.sendAppointmentUpdate(
        'nonexistent',
        'clinic-123',
        'CANCELLED',
      );

      expect(sendMessageExecute).not.toHaveBeenCalled();
    });
  });
});
