import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AppointmentStatus,
  ClinicTier,
  IntelligenceAddon,
} from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { ReminderNotificationService } from './reminder-notification.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;

  const prisma = {
    appointment: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    },
    appointmentReminder: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    reminderSettings: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    },
    clinic: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    runUnrestricted: jest.fn<(callback: () => Promise<void> | void) => unknown>(
      (callback) => callback(),
    ),
  };

  const essentialClinicPolicy = {
    tier: ClinicTier.ESSENTIAL,
    intelligenceAddon: IntelligenceAddon.NONE,
    features: {},
    whatsappAutomation: null,
  };

  const notificationService = {
    sendEmailReminder: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    sendSmsReminder: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    sendWhatsappReminder: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAppointment = {
    id: 'appt-1',
    clinicId: 'clinic-1',
    startTime: new Date('2026-04-01T10:00:00.000Z'),
    type: 'consultation',
    patient: {
      id: 'patient-1',
      firstName: 'Rahul',
      lastName: 'Sharma',
      phoneNumber: '919876543210',
      email: 'rahul@example.com',
    },
    doctor: {
      id: 'doctor-1',
      name: 'Dr. Patel',
    },
    clinic: {
      id: 'clinic-1',
      name: 'Clinic One',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.reminderSettings.findMany.mockResolvedValue([]);
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointmentReminder.findFirst.mockResolvedValue(null);
    prisma.clinic.findUnique.mockResolvedValue(essentialClinicPolicy);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReminderNotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(ReminderSchedulerService);
  });

  describe('checkAndSend30MinReminders', () => {
    it('uses runUnrestricted wrapper', async () => {
      await service.checkAndSend30MinReminders();
      expect(prisma.runUnrestricted).toHaveBeenCalled();
    });

    it('skips when no clinic settings are enabled for 30-min WhatsApp reminders', async () => {
      prisma.reminderSettings.findMany.mockResolvedValue([]);

      await service.checkAndSend30MinReminders();

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('queries reminders across enabled clinics and filters by clinicId + status + 30-min window', async () => {
      prisma.reminderSettings.findMany.mockResolvedValue([
        {
          id: 'settings-1',
          clinicId: 'clinic-1',
          enabled: true,
          minutesBefore30: true,
          whatsappEnabled: true,
        },
        {
          id: 'settings-2',
          clinicId: 'clinic-2',
          enabled: true,
          minutesBefore30: true,
          whatsappEnabled: true,
        },
      ]);
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.checkAndSend30MinReminders();

      expect(prisma.appointment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: { in: ['clinic-1', 'clinic-2'] },
            startTime: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
            },
          }),
        }),
      );
    });

    it('sends 30-min WhatsApp reminder once when phone exists and no sent reminder exists', async () => {
      const settings = {
        id: 'settings-1',
        clinicId: 'clinic-1',
        enabled: true,
        minutesBefore30: true,
        whatsappEnabled: true,
      };
      prisma.reminderSettings.findMany.mockResolvedValue([settings]);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'appt-1' }),
        settings,
        'appointment_reminder_30min',
        'whatsapp_30min',
      );
    });

    it('does not send duplicate 30-min reminder when already sent', async () => {
      const settings = {
        id: 'settings-1',
        clinicId: 'clinic-1',
        enabled: true,
        minutesBefore30: true,
        whatsappEnabled: true,
      };
      prisma.reminderSettings.findMany.mockResolvedValue([settings]);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue({
        id: 'r1',
        status: 'sent',
        type: 'whatsapp_30min',
      });

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('does not send when patient phone number is missing', async () => {
      const settings = {
        id: 'settings-1',
        clinicId: 'clinic-1',
        enabled: true,
        minutesBefore30: true,
        whatsappEnabled: true,
      };
      prisma.reminderSettings.findMany.mockResolvedValue([settings]);
      prisma.appointment.findMany.mockResolvedValue([
        {
          ...mockAppointment,
          clinicId: 'clinic-1',
          patient: {
            ...mockAppointment.patient,
            phoneNumber: '',
          },
        },
      ]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });

    it('does not send 30-min WhatsApp when clinic tier is Starter', async () => {
      const settings = {
        id: 'settings-1',
        clinicId: 'clinic-1',
        enabled: true,
        minutesBefore30: true,
        whatsappEnabled: true,
      };
      prisma.reminderSettings.findMany.mockResolvedValue([settings]);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointmentReminder.findFirst.mockResolvedValue(null);
      prisma.clinic.findUnique.mockResolvedValue({
        tier: ClinicTier.STARTER,
        intelligenceAddon: IntelligenceAddon.NONE,
        features: {},
        whatsappAutomation: null,
      });

      await service.checkAndSend30MinReminders();

      expect(notificationService.sendWhatsappReminder).not.toHaveBeenCalled();
    });
  });
});
