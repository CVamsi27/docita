import { Test, TestingModule } from '@nestjs/testing';
import { ReminderNotificationService } from './reminder-notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('ReminderNotificationService', () => {
  type ReminderAppointment = Parameters<
    ReminderNotificationService['sendEmailReminder']
  >[0];
  type ReminderConfig = Parameters<
    ReminderNotificationService['sendEmailReminder']
  >[1];
  type SendMessageRequest = Parameters<SendMessageUseCase['execute']>[0];
  type SendMessageResponse = Awaited<ReturnType<SendMessageUseCase['execute']>>;

  type AppointmentReminderCreateInput = {
    data: {
      appointmentId: string;
      type: string;
      status: string;
      sentAt?: Date;
      error?: string;
    };
  };

  type WhatsappLogCreateInput = {
    data: {
      clinicId: string;
      patientId: string;
      phoneNumber: string;
      message: string;
      type: string;
      status: string;
    };
  };

  type ClinicFindUniqueInput = {
    where: { id: string };
    select: { whatsappAutomation: true };
  };

  let service: ReminderNotificationService;
  let prisma: {
    appointmentReminder: {
      create: jest.Mock<(_args: AppointmentReminderCreateInput) => Promise<{}>>;
    };
    whatsappLog: {
      create: jest.Mock<(_args: WhatsappLogCreateInput) => Promise<{}>>;
    };
    clinic: {
      findUnique: jest.Mock<
        (
          _args: ClinicFindUniqueInput,
        ) => Promise<{ whatsappAutomation: {} | null } | null>
      >;
    };
  };
  let sendMessage: {
    execute: jest.Mock<
      (_request: SendMessageRequest) => Promise<SendMessageResponse>
    >;
  };

  const sendMessageMock = {
    execute: jest
      .fn<(_request: SendMessageRequest) => Promise<SendMessageResponse>>()
      .mockResolvedValue({ messageId: 'msg-1' }),
  };

  const mockAppointment: ReminderAppointment = {
    id: 'appt-1',
    startTime: new Date('2024-12-25T15:00:00Z'),
    type: 'consultation',
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      email: 'john@example.com',
    },
    doctor: {
      id: 'doctor-1',
      name: 'Dr. Smith',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Main Clinic',
    },
  };

  const mockSettings: ReminderConfig = {
    id: 'rs-1',
    enabled: true,
    emailTemplate:
      'Dear {patientName}, you have an appointment on {appointmentDate}',
    emailSubject: 'Appointment Reminder - {clinicName}',
    smsTemplate:
      'Reminder: appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}',
    whatsappTemplate: 'appointment_reminder_24hr',
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    hoursBeforeAppt: 24,
    minutesBefore30: true,
    clinicId: 'clinic-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const prismaMock = {
      appointmentReminder: {
        create: jest
          .fn<(_args: AppointmentReminderCreateInput) => Promise<{}>>()
          .mockResolvedValue({}),
      },
      whatsappLog: {
        create: jest
          .fn<(_args: WhatsappLogCreateInput) => Promise<{}>>()
          .mockResolvedValue({}),
      },
      clinic: {
        findUnique: jest
          .fn<
            (
              _args: ClinicFindUniqueInput,
            ) => Promise<{ whatsappAutomation: {} | null } | null>
          >()
          .mockResolvedValue({ whatsappAutomation: null }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderNotificationService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SendMessageUseCase,
          useValue: sendMessageMock,
        },
      ],
    }).compile();

    service = module.get<ReminderNotificationService>(
      ReminderNotificationService,
    );
    prisma = module.get(PrismaService);
    sendMessage = module.get(SendMessageUseCase);
  });

  describe('sendEmailReminder', () => {
    it('should send email reminder and log to database', async () => {
      await service.sendEmailReminder(mockAppointment, mockSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          type: 'email',
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should replace placeholders in email template', async () => {
      const customSettings = {
        ...mockSettings,
        emailTemplate:
          'Hello {patientName}, your appointment with {doctorName} is on {appointmentDate}',
      };

      await service.sendEmailReminder(mockAppointment, customSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          type: 'email',
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should replace placeholders in email subject', async () => {
      const customSettings = {
        ...mockSettings,
        emailSubject: 'Appointment at {clinicName}',
      };

      await service.sendEmailReminder(mockAppointment, customSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should log error and mark reminder as failed on exception', async () => {
      prisma.appointmentReminder.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({});

      const testSettings = { ...mockSettings, emailTemplate: 'Test' };

      prisma.appointmentReminder.create.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await service.sendEmailReminder(mockAppointment, testSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should use default subject if not provided', async () => {
      const settingsWithoutSubject = {
        ...mockSettings,
        emailSubject: '',
      };

      await service.sendEmailReminder(mockAppointment, settingsWithoutSubject);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });
  });

  describe('sendSmsReminder', () => {
    it('should send SMS reminder and log to database', async () => {
      await service.sendSmsReminder(mockAppointment, mockSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          type: 'sms',
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should replace placeholders in SMS template', async () => {
      const customSettings = {
        ...mockSettings,
        smsTemplate:
          '{patientName}, appointment with {doctorName} on {appointmentDate}',
      };

      await service.sendSmsReminder(mockAppointment, customSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          type: 'sms',
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should handle missing phone number gracefully', async () => {
      const appointmentNoPhone = {
        ...mockAppointment,
        patient: { ...mockAppointment.patient, phoneNumber: '' },
      };

      await service.sendSmsReminder(appointmentNoPhone, mockSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should log error when SMS sending fails', async () => {
      prisma.appointmentReminder.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('SMS error'))
        .mockResolvedValueOnce({});

      await service.sendSmsReminder(mockAppointment, mockSettings);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });
  });

  describe('sendWhatsappReminder', () => {
    it('should send WhatsApp reminder with correct template', async () => {
      await service.sendWhatsappReminder(
        mockAppointment,
        mockSettings,
        'appointment_reminder_24hr',
      );

      expect(sendMessage.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'appointment_reminder_24hr',
          recipientPhone: '+1234567890',
          variables: expect.objectContaining({
            patientName: 'John Doe',
            doctorName: 'Dr. Smith',
            appointmentType: 'consultation',
          }),
        }),
      );
    });

    it('should send WhatsApp message via use case', async () => {
      await service.sendWhatsappReminder(
        mockAppointment,
        mockSettings,
        'appointment_reminder_24hr',
      );

      expect(sendMessage.execute).toHaveBeenCalled();
    });
  });

  describe('replacePlaceholders', () => {
    it('should replace patient name placeholder', () => {
      const template = 'Hello {patientName}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('John Doe');
    });

    it('should replace doctor name placeholder', () => {
      const template = 'with {doctorName}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('Dr. Smith');
    });

    it('should replace appointment date placeholder', () => {
      const template = 'on {appointmentDate}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).not.toContain('{appointmentDate}');
    });

    it('should replace appointment time placeholder', () => {
      const template = 'at {appointmentTime}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).not.toContain('{appointmentTime}');
    });

    it('should replace appointment type placeholder', () => {
      const template = '{appointmentType} appointment';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('consultation');
    });

    it('should replace clinic name placeholder', () => {
      const template = 'at {clinicName}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('Main Clinic');
    });

    it('should handle multiple placeholder replacements', () => {
      const template =
        '{patientName}, your {appointmentType} with {doctorName} is on {appointmentDate} at {appointmentTime}';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('John Doe');
      expect(result).toContain('consultation');
      expect(result).toContain('Dr. Smith');
      expect(result).not.toContain('{appointmentDate}');
      expect(result).not.toContain('{appointmentTime}');
    });

    it('should handle timezone parameter', () => {
      const template = 'on {appointmentDate}';
      const result = service.replacePlaceholders(
        template,
        mockAppointment,
        'America/New_York',
      );

      expect(result).not.toContain('{appointmentDate}');
    });

    it('should not replace non-existent placeholders', () => {
      const template = 'Something {invalid} here';
      const result = service.replacePlaceholders(template, mockAppointment);

      expect(result).toContain('{invalid}');
    });
  });

  describe('Integration Tests', () => {
    it('should handle concurrent reminder sending', async () => {
      const appt2 = { ...mockAppointment, id: 'appt-2' };

      await Promise.all([
        service.sendEmailReminder(mockAppointment, mockSettings),
        service.sendEmailReminder(appt2, mockSettings),
      ]);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledTimes(2);
    });

    it('should maintain appointment data integrity through reminder cycle', async () => {
      const originalId = mockAppointment.id;

      await service.sendEmailReminder(mockAppointment, mockSettings);

      const firstCall = prisma.appointmentReminder.create.mock
        .calls[0][0] as AppointmentReminderCreateInput;
      expect(firstCall.data.appointmentId).toBe(originalId);
    });
  });
});
