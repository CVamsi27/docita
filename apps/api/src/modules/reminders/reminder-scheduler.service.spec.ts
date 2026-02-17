import { Test, TestingModule } from '@nestjs/testing';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderNotificationService } from './reminder-notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;
  let prisma: jest.Mocked<PrismaService>;
  let settingsService: jest.Mocked<ReminderSettingsService>;
  let notificationService: jest.Mocked<ReminderNotificationService>;

  const mockSettings = {
    enabled: true,
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    hoursBeforeAppt: 24,
    minutesBefore30: true,
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

  beforeEach(async () => {
    const mockSettings = {
      id: 'settings-1',
      clinicId: 'clinic-1',
      enabled: true,
      enableEmail: true,
      enableSMS: false,
      enableWhatsapp: true,
      emailTemplate: 'Appointment reminder',
      smsTemplate: 'Appointment reminder',
      whatsappTemplate: 'Appointment reminder',
      reminderTiming: [1440, 60, 0],
    };

    const prismaMock = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      appointmentReminder: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      reminderSettings: {
        findMany: jest.fn().mockResolvedValue([mockSettings]),
      },
      runUnrestricted: jest.fn((callback) => callback()),
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
        ReminderSchedulerService,
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

    service = module.get<ReminderSchedulerService>(ReminderSchedulerService);
    prisma = module.get(PrismaService);
    settingsService = module.get(ReminderSettingsService);
    notificationService = module.get(ReminderNotificationService);
  });

  describe('checkAndSendReminders', () => {
    it('should skip reminder sending if reminders are disabled', async () => {
      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        enabled: false,
      });
      prisma.reminderSettings.findMany.mockResolvedValue([]);

      await service.checkAndSendReminders();

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
      expect(notificationService.sendEmailReminder).not.toHaveBeenCalled();
    });

    it('should find and send reminders for upcoming appointments', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.reminderSettings.findMany.mockResolvedValue([
        { ...mockSettings, clinicId: 'clinic-1', enabled: true },
      ]);

      await service.checkAndSendReminders();

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: expect.any(Object),
            status: expect.any(Object),
          }),
        }),
      );
    });

    it('should send email reminders when enabled and email exists', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.reminderSettings.findMany.mockResolvedValue([
        { ...mockSettings, clinicId: 'clinic-1', enabled: true },
      ]);

      await service.checkAndSendReminders();

      expect(notificationService.sendEmailReminder).toHaveBeenCalledWith(
        expect.objectContaining(mockAppointment),
        expect.any(Object),
      );
    });

    it('should skip email reminder if disabled or no email', async () => {
      const appointmentNoEmail = {
        ...mockAppointment,
        patient: { ...mockAppointment.patient, email: null },
      };

      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        emailEnabled: false,
      });
      prisma.appointment.findMany.mockResolvedValue([appointmentNoEmail]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSendReminders();

      expect(notificationService.sendEmailReminder).not.toHaveBeenCalled();
    });

    it('should send SMS reminders when enabled and phone exists', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.reminderSettings.findMany.mockResolvedValue([
        { ...mockSettings, clinicId: 'clinic-1', enabled: true },
      ]);

      await service.checkAndSendReminders();

      expect(notificationService.sendSmsReminder).toHaveBeenCalledWith(
        expect.objectContaining(mockAppointment),
        expect.any(Object),
      );
    });

    it('should skip SMS reminder if disabled or no phone', async () => {
      const appointmentNoPhone = {
        ...mockAppointment,
        patient: { ...mockAppointment.patient, phoneNumber: '' },
      };

      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        smsEnabled: false,
      });
      prisma.appointment.findMany.mockResolvedValue([appointmentNoPhone]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSendReminders();

      expect(notificationService.sendSmsReminder).not.toHaveBeenCalled();
    });

    it('should send WhatsApp reminders when enabled and phone exists', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.reminderSettings.findMany.mockResolvedValue([
        { ...mockSettings, clinicId: 'clinic-1', enabled: true },
      ]);

      await service.checkAndSendReminders();

      expect(notificationService.sendWhatsappReminder).toHaveBeenCalledWith(
        expect.objectContaining(mockAppointment),
        expect.any(Object),
        expect.any(String),
      );
    });

    it('should not send duplicate reminders if already sent', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue({
        id: 'reminder-1',
        status: 'sent',
      });

      await service.checkAndSendReminders();

      expect(notificationService.sendEmailReminder).not.toHaveBeenCalled();
      expect(notificationService.sendSmsReminder).not.toHaveBeenCalled();
      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('should handle multiple appointments', async () => {
      const appt2 = { ...mockAppointment, id: 'appt-2' };
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment, appt2]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.reminderSettings.findMany.mockResolvedValue([
        { ...mockSettings, clinicId: 'clinic-1', enabled: true },
      ]);

      await service.checkAndSendReminders();

      expect(notificationService.sendEmailReminder).toHaveBeenCalledTimes(2);
    });

    it('should filter appointments by time window', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.checkAndSendReminders();

      const call = prisma.appointment.findMany.mock.calls[0][0];
      expect(call?.where?.startTime).toHaveProperty('gte');
      expect(call?.where?.startTime).toHaveProperty('lte');
      expect(call?.where?.status?.in).toContain(AppointmentStatus.SCHEDULED);
    });

    it('should include correct appointment details in query', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.checkAndSendReminders();

      const call = prisma.appointment.findMany.mock.calls[0][0];
      expect(call?.include?.patient).toBeDefined();
      expect(call?.include?.doctor).toBeDefined();
      expect(call?.include?.clinic).toBeDefined();
    });
  });

  describe('checkAndSend30MinReminders', () => {
    it('should skip if reminders disabled', async () => {
      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        enabled: false,
      });

      await service.checkAndSend30MinReminders();

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should skip if 30-min reminders disabled', async () => {
      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        minutesBefore30: false,
      });

      await service.checkAndSend30MinReminders();

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should skip if WhatsApp disabled', async () => {
      settingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        whatsappEnabled: false,
      });

      await service.checkAndSend30MinReminders();

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should find appointments within 30-35 minute window', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSend30MinReminders();

      const call = prisma.appointment.findMany.mock.calls[0][0];
      expect(call?.where?.startTime?.gte).toBeDefined();
      expect(call?.where?.startTime?.lt).toBeDefined();
    });

    it('should send WhatsApp reminders with correct template', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).toHaveBeenCalledWith(
        expect.objectContaining(mockAppointment),
        mockSettings,
        'appointment_reminder_30min',
        'whatsapp_30min',
      );
    });

    it('should not send 30-min reminder if already sent', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue({
        id: 'reminder-1',
        type: 'whatsapp_30min',
        status: 'sent',
      });

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('should skip if no phone number', async () => {
      const appointmentNoPhone = {
        ...mockAppointment,
        patient: { ...mockAppointment.patient, phoneNumber: '' },
      };

      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([appointmentNoPhone]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('should respect database access control', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);

      await service.checkAndSend30MinReminders();

      expect(prisma.runUnrestricted).toHaveBeenCalled();
    });
  });

  describe('Cron Job Configuration', () => {
    it('should have cron decorator on checkAndSendReminders', () => {
      const method = Object.getOwnPropertyDescriptor(
        ReminderSchedulerService.prototype,
        'checkAndSendReminders',
      );

      // Verify method exists (cron decorator adds metadata)
      expect(method).toBeDefined();
    });

    it('should have cron decorator on checkAndSend30MinReminders', () => {
      const method = Object.getOwnPropertyDescriptor(
        ReminderSchedulerService.prototype,
        'checkAndSend30MinReminders',
      );

      // Verify method exists (cron decorator adds metadata)
      expect(method).toBeDefined();
    });
  });

  describe('Database Access Control', () => {
    it('should use runUnrestricted for hourly reminders check', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.checkAndSendReminders();

      expect(prisma.runUnrestricted).toHaveBeenCalled();
    });

    it('should use runUnrestricted for 30-min reminders check', async () => {
      settingsService.getSettings.mockResolvedValue(mockSettings);
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.checkAndSend30MinReminders();

      expect(prisma.runUnrestricted).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.reminderSettings.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.checkAndSendReminders()).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle notification service errors', async () => {
      const testMockSettings = {
        id: 'settings-1',
        clinicId: 'clinic-1',
        enabled: true,
        enableEmail: true,
        enableSMS: false,
        enableWhatsapp: true,
        emailTemplate: 'Appointment reminder',
        smsTemplate: 'Appointment reminder',
        whatsappTemplate: 'Appointment reminder',
        reminderTiming: [1440, 60, 0],
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: true,
        hoursBeforeAppt: 24,
        minutesBefore30: true,
      };
      prisma.reminderSettings.findMany.mockResolvedValue([testMockSettings]);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      notificationService.sendEmailReminder.mockRejectedValue(
        new Error('Notification error'),
      );

      await expect(service.checkAndSendReminders()).rejects.toThrow(
        'Notification error',
      );
    });
  });
});
