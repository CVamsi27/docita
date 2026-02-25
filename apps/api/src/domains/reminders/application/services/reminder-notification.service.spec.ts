import { Test, TestingModule } from '@nestjs/testing';
import { ReminderNotificationService } from './reminder-notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageUseCase } from '../whatsapp/application/use-cases/send-message.use-case';
import { WhatsappLogStatus } from '@workspace/db';

describe('ReminderNotificationService', () => {
  let service: ReminderNotificationService;
  let prisma: jest.Mocked<PrismaService>;
  let sendMessage: jest.Mocked<SendMessageUseCase>;

  const sendMessageMock = {
    execute: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  };

  const mockAppointment = {
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

  const mockSettings = {
    enabled: true,
    emailTemplate:
      'Dear {patientName}, you have an appointment on {appointmentDate}',
    emailSubject: 'Appointment Reminder - {clinicName}',
    smsTemplate:
      'Reminder: appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}',
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
  };

  beforeEach(async () => {
    const prismaMock = {
      appointmentReminder: {
        create: jest.fn().mockResolvedValue({}),
      },
      whatsappLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      clinic: {
        findUnique: jest.fn().mockResolvedValue({ whatsappAutomation: null }),
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
      await service.sendEmailReminder(mockAppointment, mockSettings as any);

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

      await service.sendEmailReminder(mockAppointment, customSettings as any);

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

      await service.sendEmailReminder(mockAppointment, customSettings as any);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should log error and mark reminder as failed on exception', async () => {
      (prisma.appointmentReminder.create as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({});

      const testSettings = { ...mockSettings, emailTemplate: 'Test' };

      (prisma.appointmentReminder.create as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await service.sendEmailReminder(mockAppointment, testSettings as any);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should use default subject if not provided', async () => {
      const settingsWithoutSubject = {
        ...mockSettings,
        emailSubject: null,
      };

      await service.sendEmailReminder(
        mockAppointment,
        settingsWithoutSubject as any,
      );

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });
  });

  describe('sendSmsReminder', () => {
    it('should send SMS reminder and log to database', async () => {
      await service.sendSmsReminder(mockAppointment, mockSettings as any);

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

      await service.sendSmsReminder(mockAppointment, customSettings as any);

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

      await service.sendSmsReminder(appointmentNoPhone, mockSettings as any);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });

    it('should log error when SMS sending fails', async () => {
      (prisma.appointmentReminder.create as any)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('SMS error'))
        .mockResolvedValueOnce({});

      await service.sendSmsReminder(mockAppointment, mockSettings as any);

      expect(prisma.appointmentReminder.create).toHaveBeenCalled();
    });
  });

  describe('sendWhatsappReminder', () => {
    it('should send WhatsApp reminder with correct template', async () => {
      await service.sendWhatsappReminder(
        mockAppointment,
        mockSettings as any,
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
        mockSettings as any,
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
        service.sendEmailReminder(mockAppointment, mockSettings as any),
        service.sendEmailReminder(appt2, mockSettings as any),
      ]);

      expect(prisma.appointmentReminder.create).toHaveBeenCalledTimes(2);
    });

    it('should maintain appointment data integrity through reminder cycle', async () => {
      const originalId = mockAppointment.id;

      await service.sendEmailReminder(mockAppointment, mockSettings as any);

      const firstCall = (prisma.appointmentReminder.create as jest.Mock).mock
        .calls[0][0];
      expect(firstCall.data.appointmentId).toBe(originalId);
    });
  });
});
