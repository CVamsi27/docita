import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus, ReminderSettings } from '@workspace/db';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderNotificationService } from './reminder-notification.service';

interface AppointmentForReminder {
  id: string;
  startTime: Date;
  type: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
  };
  doctor: {
    id: string;
    name: string;
  };
  clinic?: {
    id: string;
    name: string;
  };
}

/**
 * ReminderSchedulerService
 * Handles scheduling and execution of appointment reminders via cron jobs
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: ReminderSettingsService,
    @Inject(forwardRef(() => ReminderNotificationService))
    private notificationService: ReminderNotificationService,
  ) {}

  /**
   * Check and send appointment reminders (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndSendReminders(): Promise<void> {
    const settings = await this.settingsService.getSettings();

    if (!settings.enabled) {
      this.logger.log('Reminders are disabled');
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + settings.hoursBeforeAppt * 60 * 60 * 1000,
    );

    return this.prisma.runUnrestricted(async () => {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          startTime: {
            gte: now,
            lte: reminderTime,
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
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

      this.logger.log(
        `Found ${appointments.length} appointments needing reminders`,
      );

      for (const appointment of appointments) {
        const existingReminder =
          await this.prisma.appointmentReminder.findFirst({
            where: {
              appointmentId: appointment.id,
              status: 'sent',
            },
          });

        if (existingReminder) {
          continue;
        }

        if (settings.emailEnabled && appointment.patient.email) {
          await this.notificationService.sendEmailReminder(
            appointment as AppointmentForReminder,
            settings,
          );
        }

        if (settings.smsEnabled && appointment.patient.phoneNumber) {
          await this.notificationService.sendSmsReminder(
            appointment as AppointmentForReminder,
            settings,
          );
        }

        // Send WhatsApp reminder (24-hour)
        if (settings.whatsappEnabled && appointment.patient.phoneNumber) {
          await this.notificationService.sendWhatsappReminder(
            appointment as AppointmentForReminder,
            settings,
            'appointment_reminder_24hr',
          );
        }
      }
    });
  }

  /**
   * Check and send 30-minute reminders (runs every 5 minutes)
   */
  @Cron('*/5 * * * *')
  async checkAndSend30MinReminders(): Promise<void> {
    const settings = await this.settingsService.getSettings();

    if (
      !settings.enabled ||
      !settings.minutesBefore30 ||
      !settings.whatsappEnabled
    ) {
      return;
    }

    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const thirtyFiveMinFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    return this.prisma.runUnrestricted(async () => {
      // Find appointments between 30-35 minutes from now
      const appointments = await this.prisma.appointment.findMany({
        where: {
          startTime: {
            gte: thirtyMinFromNow,
            lt: thirtyFiveMinFromNow,
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
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

      this.logger.log(
        `Found ${appointments.length} appointments needing 30-min reminders`,
      );

      for (const appointment of appointments) {
        // Check if 30-min reminder already sent
        const existingReminder =
          await this.prisma.appointmentReminder.findFirst({
            where: {
              appointmentId: appointment.id,
              type: 'whatsapp_30min',
              status: 'sent',
            },
          });

        if (existingReminder) {
          continue;
        }

        if (appointment.patient.phoneNumber) {
          await this.notificationService.sendWhatsappReminder(
            appointment as AppointmentForReminder,
            settings,
            'appointment_reminder_30min',
            'whatsapp_30min',
          );
        }
      }
    });
  }
}
