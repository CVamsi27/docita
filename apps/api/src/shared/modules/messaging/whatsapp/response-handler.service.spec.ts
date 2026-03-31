import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { StaffNotificationService } from './staff-notification.service';
import { ResponseHandlerService } from './response-handler.service';

describe('ResponseHandlerService', () => {
  let service: ResponseHandlerService;

  const mockAppointment = {
    id: 'appt-123',
    startTime: new Date('2026-04-01T10:00:00.000Z'),
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

  const mockPrisma = {
    appointment: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    appointmentResponse: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockWhatsappClient = {
    sendMessage: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockTemplatesService = {
    resolveTemplate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getMessageForMode: jest.fn<(...args: unknown[]) => unknown>(),
  };

  const mockStaffNotification = {
    notifyStaff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);
    mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

    mockPrisma.appointmentResponse.findFirst.mockResolvedValue(null);
    mockPrisma.appointmentResponse.create.mockResolvedValue({ id: 'resp-1' });
    mockPrisma.appointmentResponse.update.mockResolvedValue({ id: 'resp-1' });

    mockWhatsappClient.sendMessage.mockResolvedValue({ messageId: 'wamid-1' });
    mockTemplatesService.resolveTemplate.mockResolvedValue({
      content: 'Template message',
      textFallback: 'Template message',
    });
    mockTemplatesService.getMessageForMode.mockReturnValue('Template message');
    mockStaffNotification.notifyStaff.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseHandlerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: StaffNotificationService, useValue: mockStaffNotification },
      ],
    }).compile();

    service = module.get(ResponseHandlerService);
  });

  it('creates CONFIRM response and marks appointment CONFIRMED', async () => {
    await service.handlePatientResponse('appt-123', 'yes', '919876543210', 'm1');

    expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseType: 'CONFIRM',
          delayMinutes: null,
        }),
      }),
    );
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-123' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('parses "on time" as ON_THE_WAY and keeps status flow', async () => {
    await service.handlePatientResponse(
      'appt-123',
      'on time',
      '919876543210',
      'm2',
    );

    expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responseType: 'ON_THE_WAY' }),
      }),
    );
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-123' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('keeps numeric text from ambiguous partial matching', async () => {
    await service.handlePatientResponse(
      'appt-123',
      'I will reach in 10',
      '919876543210',
      'm3',
    );

    expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responseType: 'UNKNOWN' }),
      }),
    );
  });

  it('for DELAY without minutes asks follow-up question and flags pending minutes', async () => {
    await service.handlePatientResponse('appt-123', 'delayed', '919876543210', 'm4');

    expect(mockPrisma.appointmentResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseType: 'DELAY',
          delayMinutes: null,
          notes: 'delay_minutes_pending',
        }),
      }),
    );

    expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '919876543210',
        message: expect.stringContaining('reply with your expected delay in minutes'),
      }),
    );

    expect(mockStaffNotification.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'HIGH',
        data: expect.objectContaining({
          delayMinutesPending: true,
          conflictDetected: false,
        }),
      }),
    );
  });

  it('for DELAY with minutes sends delay template when there is no conflict', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      startTime: new Date('2026-04-01T11:00:00.000Z'),
    });

    await service.handlePatientResponse(
      'appt-123',
      'running late 15 min',
      '919876543210',
      'm5',
    );

    expect(mockTemplatesService.resolveTemplate).toHaveBeenCalledWith(
      'patient_response_delay',
      expect.any(Object),
      'clinic-123',
    );

    expect(mockStaffNotification.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delayMinutes: 15,
          conflictDetected: false,
        }),
      }),
    );
  });

  it('for DELAY with conflict sends schedule-impact message and high-priority staff alert', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      startTime: new Date('2026-04-01T10:10:00.000Z'),
    });

    await service.handlePatientResponse(
      'appt-123',
      'running late 20 min',
      '919876543210',
      'm6',
    );

    expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Schedule Impact'),
      }),
    );

    expect(mockStaffNotification.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'HIGH',
        data: expect.objectContaining({
          delayMinutes: 20,
          conflictDetected: true,
          nextAppointmentTime: '2026-04-01T10:10:00.000Z',
        }),
      }),
    );
  });

  it('updates pending DELAY response when patient later sends delay minutes', async () => {
    mockPrisma.appointmentResponse.findFirst.mockResolvedValue({ id: 'resp-pending' });
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await service.handlePatientResponse('appt-123', '25', '919876543210', 'm7');

    expect(mockPrisma.appointmentResponse.create).not.toHaveBeenCalled();
    expect(mockPrisma.appointmentResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resp-pending' },
        data: expect.objectContaining({
          delayMinutes: 25,
          notes: 'delay_minutes_confirmed',
        }),
      }),
    );

    expect(mockStaffNotification.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delayMinutes: 25,
          delayMinutesPending: false,
        }),
      }),
    );
  });
});
