import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AppointmentStatus,
  ReminderSettings as _ReminderSettings,
} from '@workspace/db';
import { ReminderNotificationService } from './reminder-notification.service';

interface AppointmentForReminder {
  id: string;
  clinicId: string;
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

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private databaseAccessDisabled = false;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ReminderNotificationService))
    private notificationService: ReminderNotificationService,
  ) {}

  private isDatabaseAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';

    if (code === 'P1000') {
      return true;
    }

    return (
      message.includes('authentication failed against the database server') ||
      message.includes('database credentials') ||
      message.includes('password authentication failed')
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAndSendReminders(): Promise<void> {
    if (this.databaseAccessDisabled) {
      return;
    }

    const now = new Date();

    try {
      return await this.prisma.runUnrestricted(async () => {
        const allSettings = await this.prisma.reminderSettings.findMany({
          where: { enabled: true, clinicId: { not: null } },
        });

        if (allSettings.length === 0) {
          this.logger.debug(
            'No clinic reminder settings found or all disabled',
          );
          return;
        }

        for (const settings of allSettings) {
          if (!settings.clinicId) continue;

          const reminderTime = new Date(
            now.getTime() + settings.hoursBeforeAppt * 60 * 60 * 1000,
          );

          const appointments = await this.prisma.appointment.findMany({
            where: {
              clinicId: settings.clinicId,
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

          if (appointments.length > 0) {
            this.logger.log(
              `Found ${appointments.length} appointments needing reminders for clinic ${settings.clinicId}`,
            );
          }

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

            if (settings.whatsappEnabled && appointment.patient.phoneNumber) {
              const templateId =
                settings.hoursBeforeAppt === 1
                  ? 'appointment_reminder_1hr'
                  : 'appointment_reminder_24hr';

              await this.notificationService.sendWhatsappReminder(
                appointment as AppointmentForReminder,
                settings,
                templateId,
              );
            }
          }
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling reminder scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      this.logger.error(
        'Reminder scheduler encountered an unexpected error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron('*/5 * * * *')
  async checkAndSend30MinReminders(): Promise<void> {
    if (this.databaseAccessDisabled) {
      return;
    }

    try {
      return await this.prisma.runUnrestricted(async () => {
        const allSettings = await this.prisma.reminderSettings.findMany({
          where: {
            enabled: true,
            minutesBefore30: true,
            whatsappEnabled: true,
            clinicId: { not: null },
          },
        });

        if (allSettings.length === 0) {
          this.logger.debug(
            'No clinic settings found for 30-min WhatsApp reminders',
          );
          return;
        }

        const now = new Date();
        const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        const thirtyFiveMinFromNow = new Date(now.getTime() + 35 * 60 * 1000);

        const clinicIds = allSettings.map((s) => s.clinicId as string);
        const settingsByClinicId = new Map(
          allSettings.map((s) => [s.clinicId, s]),
        );

        const appointments = await this.prisma.appointment.findMany({
          where: {
            clinicId: { in: clinicIds },
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
              select: { id: true, name: true },
            },
            clinic: {
              select: { id: true, name: true },
            },
          },
        });

        if (appointments.length > 0) {
          this.logger.log(
            `Found ${appointments.length} appointments needing 30-min reminders across ${clinicIds.length} clinics`,
          );
        }

        for (const appointment of appointments) {
          const settings = settingsByClinicId.get(appointment.clinicId);
          if (!settings) continue;

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
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling reminder scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      this.logger.error(
        '30-min reminder scheduler encountered an unexpected error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
