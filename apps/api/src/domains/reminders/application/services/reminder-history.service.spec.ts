import { Test, TestingModule } from '@nestjs/testing';
import { ReminderHistoryService } from './reminder-history.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderNotificationService } from './reminder-notification.service';
import { NotFoundException } from '@nestjs/common';

describe('ReminderHistoryService', () => {
  let service: ReminderHistoryService;
  let prisma: jest.Mocked<PrismaService>;
  let settingsService: jest.Mocked<ReminderSettingsService>;
  let notificationService: jest.Mocked<ReminderNotificationService>;

  const mockAppointment = {
    id: 'appt-1',
    clinicId: 'clinic-1',
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
    emailTemplate: 'Test email',
    emailSubject: 'Test subject',
    smsTemplate: 'Test SMS',
  };

  const mockReminder = {
    id: 'reminder-1',
    appointmentId: 'appt-1',
    type: 'email',
    status: 'sent',
    sentAt: new Date(),
    createdAt: new Date(),
    appointment: {
      id: 'appt-1',
      patient: {
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  };

  beforeEach(async () => {
    const prismaMock = {
      appointmentReminder: {
        findMany: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const settingsServiceMock = {
      getSettings: jest.fn(),
    };

    const notificationServiceMock = {
      sendEmailReminder: jest.fn(),
      sendSmsReminder: jest.fn(),
      sendWhatsappReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderHistoryService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ReminderSettingsService,
          useValue: settingsServiceMock,
        },
        {
          provide: ReminderNotificationService,
          useValue: notificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<ReminderHistoryService>(ReminderHistoryService);
    prisma = module.get(PrismaService);
    settingsService = module.get(ReminderSettingsService);
    notificationService = module.get(ReminderNotificationService);
  });

  describe('getReminderHistory', () => {
    it('should retrieve reminder history for clinic', async () => {
      const mockHistory = [mockReminder];
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-1' } as never])
        .mockResolvedValueOnce([
          {
            id: 'appt-1',
            patient: {
              firstName: 'John',
              lastName: 'Doe',
            },
          } as never,
        ]);
      prisma.appointmentReminder.findMany.mockResolvedValue(
        mockHistory as never,
      );

      const result = await service.getReminderHistory('clinic-1');

      expect(result).toHaveLength(1);
      expect(prisma.appointmentReminder.findMany).toHaveBeenCalledWith({
        where: {
          appointmentId: { in: ['appt-1'] },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use default limit of 50', async () => {
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-1' } as never])
        .mockResolvedValueOnce([] as never);
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      await service.getReminderHistory('clinic-1');

      expect(prisma.appointmentReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should allow custom limit', async () => {
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-1' } as never])
        .mockResolvedValueOnce([] as never);
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      await service.getReminderHistory('clinic-1', 100);

      expect(prisma.appointmentReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should order by creation date descending', async () => {
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-1' } as never])
        .mockResolvedValueOnce([] as never);
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      await service.getReminderHistory('clinic-1');

      expect(prisma.appointmentReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array if no history found', async () => {
      prisma.appointment.findMany.mockResolvedValueOnce([] as never);
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      const result = await service.getReminderHistory('clinic-empty');

      expect(result).toEqual([]);
    });

    it('should filter by clinic ID correctly', async () => {
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-2' } as never])
        .mockResolvedValueOnce([] as never);
      prisma.appointmentReminder.findMany.mockResolvedValue([]);

      await service.getReminderHistory('clinic-2');

      const call = prisma.appointment.findMany.mock.calls[0][0];
      expect(call).toEqual({
        where: { clinicId: 'clinic-2' },
        select: { id: true },
      });
    });

    it('should include appointment and patient data', async () => {
      prisma.appointment.findMany
        .mockResolvedValueOnce([{ id: 'appt-1' } as never])
        .mockResolvedValueOnce([
          {
            id: 'appt-1',
            patient: {
              firstName: 'John',
              lastName: 'Doe',
            },
          } as never,
        ]);
      prisma.appointmentReminder.findMany.mockResolvedValue([
        mockReminder,
      ] as never);

      const result = await service.getReminderHistory('clinic-1');

      expect(result[0]).toHaveProperty('appointment');
      expect(result[0].appointment).toHaveProperty('patient');
    });

    it('should handle multiple reminders', async () => {
      const reminder1 = { ...mockReminder, id: 'reminder-1' };
      const reminder2 = { ...mockReminder, id: 'reminder-2' };
      const reminder3 = { ...mockReminder, id: 'reminder-3' };

      prisma.appointment.findMany
        .mockResolvedValueOnce([
          { id: 'appt-1' } as never,
          { id: 'appt-2' } as never,
          { id: 'appt-3' } as never,
        ])
        .mockResolvedValueOnce([
          {
            id: 'appt-1',
            patient: { firstName: 'John', lastName: 'Doe' },
          } as never,
          {
            id: 'appt-2',
            patient: { firstName: 'John', lastName: 'Doe' },
          } as never,
          {
            id: 'appt-3',
            patient: { firstName: 'John', lastName: 'Doe' },
          } as never,
        ]);
      prisma.appointmentReminder.findMany.mockResolvedValue([
        reminder1,
        reminder2,
        reminder3,
      ] as never);

      const result = await service.getReminderHistory('clinic-1');

      expect(result.length).toBe(3);
    });
  });

  describe('sendManualReminder', () => {
    it('should throw NotFoundException if appointment not found', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.sendManualReminder('invalid-id', 'email'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send email reminder when type is email', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'email');

      expect(notificationService.sendEmailReminder).toHaveBeenCalledWith(
        mockAppointment,
        mockSettings,
      );
    });

    it('should send SMS reminder when type is sms', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'sms');

      expect(notificationService.sendSmsReminder).toHaveBeenCalledWith(
        mockAppointment,
        mockSettings,
      );
    });

    it('should send WhatsApp reminder when type is whatsapp', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'whatsapp');

      expect(notificationService.sendWhatsappReminder).toHaveBeenCalledWith(
        mockAppointment,
        mockSettings,
        'appointment_reminder_24hr',
        'whatsapp_manual',
      );
    });

    it('should fetch appointment with full patient details', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'email');

      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should use appointment settings for reminder', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'email');

      expect(settingsService.getSettings).toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);
      notificationService.sendEmailReminder.mockRejectedValue(
        new Error('Email send failed'),
      );

      await expect(
        service.sendManualReminder('appt-1', 'email'),
      ).rejects.toThrow('Email send failed');
    });

    it('should handle SMS sending failure', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);
      notificationService.sendSmsReminder.mockRejectedValue(
        new Error('SMS send failed'),
      );

      await expect(service.sendManualReminder('appt-1', 'sms')).rejects.toThrow(
        'SMS send failed',
      );
    });

    it('should handle WhatsApp sending failure', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);
      notificationService.sendWhatsappReminder.mockRejectedValue(
        new Error('WhatsApp send failed'),
      );

      await expect(
        service.sendManualReminder('appt-1', 'whatsapp'),
      ).rejects.toThrow('WhatsApp send failed');
    });
  });

  describe('Appointment Retrieval', () => {
    it('should not throw when appointment exists', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await expect(
        service.sendManualReminder('appt-1', 'email'),
      ).resolves.not.toThrow();
    });

    it('should pass correct appointment ID to findUnique', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-123', 'email');

      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        include: expect.any(Object),
      });
    });
  });

  describe('Reminder Type Handling', () => {
    it('should correctly dispatch based on reminder type', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      const types: Array<'email' | 'sms' | 'whatsapp'> = [
        'email',
        'sms',
        'whatsapp',
      ];

      for (const type of types) {
        await service.sendManualReminder('appt-1', type);
      }

      expect(notificationService.sendEmailReminder).toHaveBeenCalledTimes(1);
      expect(notificationService.sendSmsReminder).toHaveBeenCalledTimes(1);
      expect(notificationService.sendWhatsappReminder).toHaveBeenCalledTimes(1);
    });

    it('should pass appointment data correctly to email service', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.sendManualReminder('appt-1', 'email');

      expect(notificationService.sendEmailReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appt-1',
          patient: expect.objectContaining({
            firstName: 'John',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate appointment not found error', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.sendManualReminder('non-existent', 'email'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate database errors from appointment lookup', async () => {
      prisma.appointment.findUnique.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(
        service.sendManualReminder('appt-1', 'email'),
      ).rejects.toThrow('Database connection error');
    });

    it('should propagate settings retrieval errors', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      settingsService.getSettings.mockRejectedValue(
        new Error('Settings error'),
      );

      await expect(
        service.sendManualReminder('appt-1', 'email'),
      ).rejects.toThrow('Settings error');
    });
  });
});
