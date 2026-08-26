import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  REMINDER_PERSISTENCE_PORT,
  type ReminderPersistencePort,
} from '@/domains/reminders/application/ports/reminder-persistence.port';
import { Cron } from '@nestjs/schedule';
import {
  AppointmentStatus,
  Prisma,
  ReminderSettings as _ReminderSettings,
} from '@workspace/db';
import { ReminderNotificationService } from './reminder-notification.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';
import { isDatabaseAuthError } from '@/shared/common/utils/is-database-auth-error';

const APPOINTMENT_REMINDER_INCLUDE = {
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
    select: { id: true, name: true, timezone: true },
  },
} satisfies Prisma.AppointmentInclude;

const HOURLY_CHANNEL_TYPES = ['email', 'sms', 'whatsapp'] as const;

type AppointmentForReminder = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_REMINDER_INCLUDE;
}>;

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private databaseAccessDisabled = false;

  constructor(
    @Inject(REMINDER_PERSISTENCE_PORT)
    private persistence: ReminderPersistencePort,
    @Inject(forwardRef(() => ReminderNotificationService))
    private notificationService: ReminderNotificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Cron(CRON_SCHEDULES.REMINDER_HOURLY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('reminders.hourly')
  async checkAndSendReminders(): Promise<void> {
    if (this.databaseAccessDisabled) {
      return;
    }

    const now = this.clock.now();

    try {
      // RLS-BYPASS: reminder scheduler scans appointments without clinic request context
      return await this.persistence.runUnrestricted(async () => {
        const allSettings = await this.persistence.reminderSettings.findMany({
          where: { enabled: true, clinicId: { not: null } },
        });

        if (allSettings.length === 0) {
          this.logger.debug(
            'No clinic reminder settings found or all disabled',
          );
          return;
        }

        const clinicResults = await Promise.allSettled(
          allSettings
            .filter(
              (settings): settings is typeof settings & { clinicId: string } =>
                !!settings.clinicId,
            )
            .map((settings) =>
              this.processClinicHourlyReminders(settings, now),
            ),
        );
        const clinicFailures = clinicResults.filter(
          (r) => r.status === 'rejected',
        );
        if (clinicFailures.length > 0) {
          this.logger.warn(
            `${clinicFailures.length} clinic hourly reminder batch(es) failed`,
          );
        }
      });
    } catch (error) {
      this.handleCronError(error, 'Reminder scheduler');
    }
  }

  @Cron(CRON_SCHEDULES.REMINDER_DISPATCH, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('reminders.30min-dispatch')
  async checkAndSend30MinReminders(): Promise<void> {
    if (this.databaseAccessDisabled) {
      return;
    }

    try {
      // RLS-BYPASS: reminder scheduler scans appointments without clinic request context
      return await this.persistence.runUnrestricted(async () => {
        const allSettings = await this.persistence.reminderSettings.findMany({
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

        const now = this.clock.now();
        // The window overlaps the previous tick by five minutes so a failed
        // or skipped cron run self-heals on the next one; the type-scoped
        // dedupe lookup below prevents double-sends for that overlap.
        const twentyFiveMinFromNow = new Date(now.getTime() + 25 * 60 * 1000);
        const thirtyFiveMinFromNow = new Date(now.getTime() + 35 * 60 * 1000);

        const clinicIds = allSettings.flatMap((setting) =>
          setting.clinicId ? [setting.clinicId] : [],
        );
        const settingsByClinicId = new Map(
          allSettings.map((s) => [s.clinicId, s]),
        );

        const appointments = await this.persistence.appointment.findMany({
          where: {
            clinicId: { in: clinicIds },
            startTime: {
              gte: twentyFiveMinFromNow,
              lt: thirtyFiveMinFromNow,
            },
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
            },
          },
          include: APPOINTMENT_REMINDER_INCLUDE,
        });

        // Type-scoped dedupe: only a previously SENT whatsapp_30min reminder
        // suppresses this pass — email/SMS/hourly rows must never mask the
        // 30-minute nudge the clinic explicitly enabled.
        const existingReminders =
          await this.persistence.appointmentReminder.findMany({
            where: {
              appointmentId: { in: appointments.map((a) => a.id) },
              status: 'sent',
              type: 'whatsapp_30min',
            },
            select: { appointmentId: true },
          });
        const existingReminderIds = new Set(
          existingReminders.map((r) => r.appointmentId),
        );

        if (appointments.length > 0) {
          this.logger.log(
            `Found ${appointments.length} appointments needing 30-min reminders across ${clinicIds.length} clinics`,
          );
        }

        const appointmentResults = await Promise.allSettled(
          appointments.map((appointment) => {
            const settings = settingsByClinicId.get(appointment.clinicId);
            if (!settings) return Promise.resolve();
            return this.sendThirtyMinuteWhatsappReminder(
              appointment,
              settings,
              existingReminderIds,
            );
          }),
        );
        const appointmentFailures = appointmentResults.filter(
          (r) => r.status === 'rejected',
        );
        if (appointmentFailures.length > 0) {
          this.logger.warn(
            `${appointmentFailures.length} 30-min WhatsApp reminder(s) failed`,
          );
        }
      });
    } catch (error) {
      this.handleCronError(error, '30-min reminder scheduler');
    }
  }

  private handleCronError(error: unknown, context: string): void {
    if (isDatabaseAuthError(error)) {
      this.databaseAccessDisabled = true;
      this.logger.warn(
        'Disabling reminder scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
      );
      return;
    }

    this.logger.error(
      `${context} encountered an unexpected error`,
      error instanceof Error ? error.stack : String(error),
    );
  }

  private async processClinicHourlyReminders(
    settings: _ReminderSettings & { clinicId: string },
    now: Date,
  ): Promise<void> {
    const reminderTime = new Date(
      now.getTime() + settings.hoursBeforeAppt * 60 * 60 * 1000,
    );

    const appointments = await this.persistence.appointment.findMany({
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
      include: APPOINTMENT_REMINDER_INCLUDE,
    });

    // Per-channel dedupe: an already-sent email must never suppress the
    // WhatsApp/SMS nudges of the same pass, and vice versa.
    const existingReminders =
      await this.persistence.appointmentReminder.findMany({
        where: {
          appointmentId: { in: appointments.map((a) => a.id) },
          status: 'sent',
          type: { in: [...HOURLY_CHANNEL_TYPES] },
        },
        select: { appointmentId: true, type: true },
      });
    const sentByType = new Map<string, Set<string>>();
    for (const row of existingReminders) {
      const ids = sentByType.get(row.type) ?? new Set<string>();
      ids.add(row.appointmentId);
      sentByType.set(row.type, ids);
    }

    if (appointments.length > 0) {
      this.logger.log(
        `Found ${appointments.length} appointments needing reminders for clinic ${settings.clinicId}`,
      );
    }

    const results = await Promise.allSettled(
      appointments.map((appointment) =>
        this.sendHourlyAppointmentReminder(appointment, settings, sentByType),
      ),
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `${failures.length} hourly reminder(s) failed for clinic ${settings.clinicId}`,
      );
    }
  }

  /**
   * Dedupe guard for `sendThirtyMinuteWhatsappReminder`: skips appointments
   * a prior pass already reminded (tracked via the optional dedupe set).
   */
  private reminderAlreadySent(
    appointment: AppointmentForReminder,
    existingReminderIds?: Set<string>,
  ): boolean {
    return existingReminderIds?.has(appointment.id) ?? false;
  }

  private hasSentChannelReminder(
    sentByType: Map<string, Set<string>> | undefined,
    appointmentId: string,
    type: string,
  ): boolean {
    return sentByType?.get(type)?.has(appointmentId) ?? false;
  }

  private async sendHourlyAppointmentReminder(
    appointment: AppointmentForReminder,
    settings: _ReminderSettings,
    sentByType?: Map<string, Set<string>>,
  ): Promise<void> {
    const alreadySent = (type: string) =>
      this.hasSentChannelReminder(sentByType, appointment.id, type);

    if (settings.emailEnabled && appointment.patient.email) {
      if (!alreadySent('email')) {
        await this.notificationService.sendEmailReminder(appointment, settings);
      }
    }

    if (settings.smsEnabled && appointment.patient.phoneNumber) {
      if (!alreadySent('sms')) {
        await this.notificationService.sendSmsReminder(appointment, settings);
      }
    }

    if (
      settings.whatsappEnabled &&
      appointment.patient.phoneNumber &&
      settings.clinicId &&
      !alreadySent('whatsapp') &&
      (await isClinicWhatsAppAutomationSendingAllowed(
        this.persistence,
        settings.clinicId,
      ))
    ) {
      const templateId =
        settings.hoursBeforeAppt === 1
          ? 'appointment_reminder_1hr'
          : 'appointment_reminder_24hr';

      await this.notificationService.sendWhatsappReminder(
        appointment,
        settings,
        templateId,
      );
    }
  }

  // See the jscpd note above `sendHourlyAppointmentReminder` for why this
  // signature and guard intentionally mirror that method's.
  // jscpd:ignore-start
  private async sendThirtyMinuteWhatsappReminder(
    appointment: AppointmentForReminder,
    settings: _ReminderSettings,
    existingReminderIds?: Set<string>,
  ): Promise<void> {
    if (this.reminderAlreadySent(appointment, existingReminderIds)) {
      return;
    }
    // jscpd:ignore-end

    if (
      appointment.patient.phoneNumber &&
      (await isClinicWhatsAppAutomationSendingAllowed(
        this.persistence,
        appointment.clinicId,
      ))
    ) {
      await this.notificationService.sendWhatsappReminder(
        appointment,
        settings,
        'appointment_reminder_30min',
        'whatsapp_30min',
      );
    }
  }
}
