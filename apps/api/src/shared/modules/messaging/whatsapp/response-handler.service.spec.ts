import { Test, TestingModule } from '@nestjs/testing';
import { ResponseHandlerService } from './response-handler.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { StaffNotificationService } from './staff-notification.service';
import { Logger } from '@nestjs/common';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('ResponseHandlerService', () => {
  let service: ResponseHandlerService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  let mockWhatsappClient: { sendMessage: ReturnType<typeof jest.fn> };
  let mockTemplatesService: {
    resolveTemplate: ReturnType<typeof jest.fn>;
    getMessageForMode: ReturnType<typeof jest.fn>;
  };
  let mockStaffNotification: { notifyStaff: ReturnType<typeof jest.fn> };

  const mockAppointment = {
    id: 'appt-123',
    startTime: new Date('2026-04-01T10:00:00Z'),
    patient: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      phoneNumber: '919876543210',
    },
    doctor: {
      id: 'doctor-123',
      name: 'Dr. Patel',
    },
    clinic: {
      id: 'clinic-123',
      name: 'Test Clinic',
    },
  };

  function buildMockPrisma() {
    return {
      appointment: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(mockAppointment),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(mockAppointment),
      },
      appointmentResponse: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'resp-123' }),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'resp-123' }),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();
    mockWhatsappClient = {
      sendMessage: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'msg-123' }),
    };
    mockTemplatesService = {
      resolveTemplate: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          content: 'Appointment confirmed',
          buttons: [],
        }),
      getMessageForMode: jest.fn().mockReturnValue('Appointment confirmed'),
    };
    mockStaffNotification = {
      notifyStaff: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(undefined),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseHandlerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: StaffNotificationService, useValue: mockStaffNotification },
      ],
    }).compile();

    service = module.get<ResponseHandlerService>(ResponseHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePatientResponse', () => {
    it('should create an AppointmentResponse record with correct responseType', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.msg1',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appointmentId: 'appt-123',
          responseType: 'CONFIRM',
          patientMessage: 'yes',
        }),
      });
    });

    it('should update appointment status for CONFIRM response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.msg2',
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: { status: 'CONFIRMED' },
      });
    });

    it('should update appointment status to CANCELLED for cancel response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'cancel',
        '919876543210',
        'wamid.msg3',
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should update appointment status to RESCHEDULING for reschedule response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'reschedule',
        '919876543210',
        'wamid.msg4',
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: { status: 'RESCHEDULING' },
      });
    });

    it('should NOT update appointment status for DELAY response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'late',
        '919876543210',
        'wamid.msg5',
      );

      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should call notifyStaff and mark staffNotified after processing', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.msg6',
      );

      expect(mockStaffNotification.notifyStaff).toHaveBeenCalled();
      expect(mockPrisma.appointmentResponse.update).toHaveBeenCalledWith({
        where: { id: 'resp-123' },
        data: expect.objectContaining({
          staffNotified: true,
          staffNotifiedAt: expect.any(Date),
        }),
      });
    });

    it('should return early when appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await service.handlePatientResponse(
        'nonexistent',
        'yes',
        '919876543210',
        'wamid.msg7',
      );

      expect(mockPrisma.appointmentResponse.create).not.toHaveBeenCalled();
    });
  });

  describe('response parsing', () => {
    const testCases: Array<[string, string]> = [
      ['btn_confirm', 'CONFIRM'],
      ['btn_cancel', 'CANCEL'],
      ['yes', 'CONFIRM'],
      ['ok', 'CONFIRM'],
      ['okay', 'CONFIRM'],
      ['confirmed', 'CONFIRM'],
      ['coming', 'ON_THE_WAY'],
      ['on my way', 'ON_THE_WAY'],
      ['late', 'DELAY'],
      ['running late', 'DELAY'],
      ['reschedule', 'RESCHEDULE'],
      ['cancel', 'CANCEL'],
      ['no', 'CANCEL'],
      ['1', 'CONFIRM'],
      ['2', 'DELAY'],
      ['3', 'RESCHEDULE'],
      ['4', 'CANCEL'],
    ];

    for (const [input, expectedType] of testCases) {
      it(`should parse "${input}" as ${expectedType}`, async () => {
        await service.handlePatientResponse(
          'appt-123',
          input,
          '919876543210',
          'wamid.parse',
        );

        expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ responseType: expectedType }),
        });
        jest.clearAllMocks();
        mockPrisma = buildMockPrisma();
      });
    }

    it('should parse unknown text as UNKNOWN', async () => {
      // Text must not contain any RESPONSE_MAPPING keywords or digit substrings (1-4)
      await service.handlePatientResponse(
        'appt-123',
        'blah blah blah',
        '919876543210',
        'wamid.unknown',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ responseType: 'UNKNOWN' }),
      });
    });

    it('should do case-insensitive matching', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'YES',
        '919876543210',
        'wamid.case',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ responseType: 'CONFIRM' }),
      });
    });

    it('should do partial keyword matching', async () => {
      // Use text that contains "running late" but no single-digit substrings (1-4)
      await service.handlePatientResponse(
        'appt-123',
        'I am running late today',
        '919876543210',
        'wamid.partial',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ responseType: 'DELAY' }),
      });
    });
  });

  describe('delay minutes extraction', () => {
    it('should extract "15 min" as 15 minutes', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'running late 15 min',
        '919876543210',
        'wamid.delay1',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ delayMinutes: 15 }),
      });
    });

    it('should extract "running 20 late" as 20 minutes', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'running 20 late',
        '919876543210',
        'wamid.delay2',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ delayMinutes: 20 }),
      });
    });

    it('should default to 15 minutes for DELAY response without explicit time', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'late',
        '919876543210',
        'wamid.delay3',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ delayMinutes: 15 }),
      });
    });

    it('should return null delay for non-delay responses', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.delay4',
      );

      expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ delayMinutes: null }),
      });
    });
  });

  describe('patient confirmation messages', () => {
    it('should send patient_response_confirm template for CONFIRM response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.conf1',
      );

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'patient_response_confirm',
        expect.any(Object),
        'clinic-123',
      );
    });

    it('should send patient_response_delay template for DELAY response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'late',
        '919876543210',
        'wamid.conf2',
      );

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'patient_response_delay',
        expect.any(Object),
        'clinic-123',
      );
    });

    it('should send direct text message for RESCHEDULE response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'reschedule',
        '919876543210',
        'wamid.conf3',
      );

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          message: expect.stringContaining('Reschedule'),
        }),
      );
      expect(mockTemplatesService.resolveTemplate).not.toHaveBeenCalled();
    });

    it('should send direct text message for CANCEL response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'cancel',
        '919876543210',
        'wamid.conf4',
      );

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          message: expect.stringContaining('Cancelled'),
        }),
      );
    });

    it('should send generic acknowledgment for UNKNOWN response', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'gibberish',
        '919876543210',
        'wamid.conf5',
      );

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
        }),
      );
    });

    it('should send ON_THE_WAY confirmation using patient_response_confirm template', async () => {
      await service.handlePatientResponse(
        'appt-123',
        'on my way',
        '919876543210',
        'wamid.conf6',
      );

      expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
        'patient_response_confirm',
        expect.any(Object),
        'clinic-123',
      );
    });
  });
});
