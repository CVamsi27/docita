import { Test, TestingModule } from '@nestjs/testing';
import { SystemEventsService } from './system-events.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { Logger } from '@nestjs/common';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('SystemEventsService', () => {
  let service: SystemEventsService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  let mockTemplatesService: {
    resolveTemplate: ReturnType<typeof jest.fn>;
    getMessageForMode: ReturnType<typeof jest.fn>;
  };
  let mockWhatsappClient: { sendMessage: ReturnType<typeof jest.fn> };

  function buildMockPrisma() {
    return {
      clinic: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({
            id: 'clinic-123',
            whatsappAutomation: { enabled: true },
          })),
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
            clinic: { name: 'Test Clinic' },
          })),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();
    mockTemplatesService = {
      resolveTemplate: jest.fn().mockImplementation(async () => ({
        content: 'Resolved template message',
        buttons: [],
      })),
      getMessageForMode: jest.fn().mockReturnValue('Formatted message'),
    };
    mockWhatsappClient = {
      sendMessage: jest.fn().mockImplementation(async () => ({
        success: true,
        messageId: 'msg-123',
      })),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemEventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
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
    it('should fetch prescription, resolve template, and send message', async () => {
      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockPrisma.prescription.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rx-123' } }),
      );
      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'prescription_created',
        expect.any(Object),
        'clinic-123',
      );
      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543210',
        message: 'Formatted message',
      });
    });

    it('should skip when WhatsApp is disabled for clinic', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        whatsappAutomation: { enabled: false },
      });

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockPrisma.prescription.findUnique).not.toHaveBeenCalled();
      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when prescription is not found', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue(null);

      await service.sendPrescriptionSystem('nonexistent', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when patient has no phone number', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-123',
        patient: { firstName: 'Test', lastName: 'Patient', phoneNumber: null },
        doctor: { name: 'Dr. Patel' },
        appointment: { clinic: { name: 'Test Clinic' } },
      });

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send message when template resolves to null', async () => {
      mockTemplatesService.resolveTemplate.mockResolvedValue(null);

      await service.sendPrescriptionSystem('rx-123', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendInvoiceSystem', () => {
    it('should fetch invoice, resolve template, and send message', async () => {
      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-123' } }),
      );
      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'invoice_created',
        expect.any(Object),
        'clinic-123',
      );
      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543211',
        message: 'Formatted message',
      });
    });

    it('should skip when WhatsApp is disabled for clinic', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        whatsappAutomation: { enabled: false },
      });

      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when invoice is not found', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await service.sendInvoiceSystem('nonexistent', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when patient has no phone number', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-123',
        total: 1500,
        patient: { firstName: 'Test', lastName: 'Patient', phoneNumber: null },
        appointment: { clinic: { name: 'Test Clinic' } },
      });

      await service.sendInvoiceSystem('inv-123', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentConfirmation', () => {
    it('should send appointment_confirmation template', async () => {
      await service.sendAppointmentConfirmation('appt-123', 'clinic-123');

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'appointment_confirmation',
        expect.objectContaining({
          patientName: 'Sunita Devi',
          clinicName: 'Test Clinic',
          doctorName: 'Dr. Sharma',
        }),
        'clinic-123',
      );
      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith({
        to: '919876543212',
        message: 'Formatted message',
      });
    });

    it('should skip when appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await service.sendAppointmentConfirmation('nonexistent', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when WhatsApp is disabled', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: 'clinic-123',
        whatsappAutomation: { enabled: false },
      });

      await service.sendAppointmentConfirmation('appt-123', 'clinic-123');

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendAppointmentUpdate', () => {
    it('should send appointment_cancelled template for CANCELLED type', async () => {
      await service.sendAppointmentUpdate(
        'appt-123',
        'clinic-123',
        'CANCELLED',
      );

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'appointment_cancelled',
        expect.any(Object),
        'clinic-123',
      );
    });

    it('should send appointment_rescheduled template for RESCHEDULED type', async () => {
      await service.sendAppointmentUpdate(
        'appt-123',
        'clinic-123',
        'RESCHEDULED',
      );

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'appointment_rescheduled',
        expect.any(Object),
        'clinic-123',
      );
    });

    it('should skip when appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await service.sendAppointmentUpdate(
        'nonexistent',
        'clinic-123',
        'CANCELLED',
      );

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });
});
