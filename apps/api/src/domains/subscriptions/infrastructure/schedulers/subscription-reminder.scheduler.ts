import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { NotifySubscriptionGraceDeadlineUseCase } from '@/domains/subscriptions/application/use-cases/notify-subscription-grace-deadline.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { ExpireSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/expire-subscription.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus } from '@workspace/db';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { addUtcCalendarDays } from '@/shared/schedule/scheduler-date.util';
import { isDatabaseAuthError } from '@/shared/common/utils/is-database-auth-error';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);
  private databaseAccessDisabled = false;
  constructor(
    private readonly notifyUseCase: NotifyExpiringSubscriptionsUseCase,
    private readonly notifyGraceDeadlineUseCase: NotifySubscriptionGraceDeadlineUseCase,
    private readonly graceUseCase: EnterGracePeriodUseCase,
    private readonly expireSubscriptionUseCase: ExpireSubscriptionUseCase,
    private readonly prisma: PrismaService,
    private readonly adminAlerts: AdminAlertsService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Shared `catch` handler for both cron jobs below — a database
   * authentication failure permanently disables the scheduler (until the
   * process restarts with corrected credentials), while any other error is
   * just logged. Keeping the disable-and-warn branch in one place stops the
   * two jobs' recovery behavior from drifting apart.
   */
  private handleCronFailure(failureMessage: string, error: unknown): void {
    if (isDatabaseAuthError(error)) {
      this.databaseAccessDisabled = true;
      this.logger.warn(
        'Disabling subscription scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
      );
      return;
    }

    this.logCronError(failureMessage, error);
  }

  private logCronError(message: string, error: unknown): void {
    if (error instanceof Error) {
      this.logger.error(`${message}: ${error.message}`, error.stack);
      return;
    }

    let serializedError = String(error);
    try {
      serializedError = JSON.stringify(error);
    } catch {
      serializedError = '[unserializable error]';
    }

    this.logger.error(`${message}: ${serializedError}`);
  }

  @Cron(CRON_SCHEDULES.SUBSCRIPTION_REMINDER_DAILY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('subscriptions.reminder-daily')
  async handleReminders() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Running subscription reminder cron');
    const now = this.clock.now();

    const schedules = [
      { days: 14, type: 'expiry_14d' },
      { days: 10, type: 'expiry_10d' },
      { days: 7, type: 'expiry_7d' },
      { days: 3, type: 'expiry_3d' },
      { days: 1, type: 'expiry_1d' },
      { days: 0, type: 'expiry_0d' },
    ];

    try {
      // RLS-BYPASS: subscription scheduler runs system-wide without request tenant
      const settled = await this.prisma.runUnrestricted(async () =>
        Promise.allSettled(
          schedules.map((schedule) =>
            this.notifyUseCase.execute({
              targetDate: addUtcCalendarDays(now, schedule.days),
              reminderType: schedule.type,
            }),
          ),
        ),
      );

      const scheduleFailures = settled.filter((r) => r.status === 'rejected');
      if (scheduleFailures.length > 0) {
        this.logger.warn(
          `${scheduleFailures.length} subscription expiry reminder batch(es) failed`,
        );
      }

      const results = settled
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      const attempted = results.reduce((sum, r) => sum + r.attemptedClinics, 0);
      const sent = results.reduce((sum, r) => sum + r.sent, 0);
      const failed = results.reduce((sum, r) => sum + r.failed, 0);

      if (attempted > 0) {
        const byType = results
          .map(
            (r) =>
              `${r.reminderType}: attempted=${r.attemptedClinics}, sent=${r.sent}, failed=${r.failed}`,
          )
          .join('\n');

        await this.adminAlerts.sendAdminAlert({
          alertKey: `subscription_expiry_reminders_daily`,
          severity: failed > 0 ? 'warn' : 'info',
          subject: 'Subscription expiry reminders summary',
          text:
            `Subscription expiry reminders executed.\n` +
            `Attempted: ${attempted}\nSent: ${sent}\nFailed: ${failed}\n\n` +
            byType,
          dedupeWindowMs: 12 * 60 * 60 * 1000,
        });
      }

      const graceSchedules = [
        { offsetDays: 7, type: 'grace_deadline_7d' },
        { offsetDays: 3, type: 'grace_deadline_3d' },
        { offsetDays: 1, type: 'grace_deadline_1d' },
        { offsetDays: 0, type: 'grace_deadline_today' },
      ];
      // RLS-BYPASS: subscription scheduler runs system-wide without request tenant
      await this.prisma.runUnrestricted(async () => {
        const graceResults = await Promise.allSettled(
          graceSchedules.map((schedule) =>
            this.notifyGraceDeadlineUseCase.execute({
              targetDate: addUtcCalendarDays(now, schedule.offsetDays),
              reminderType: schedule.type,
            }),
          ),
        );
        const graceFailures = graceResults.filter(
          (r) => r.status === 'rejected',
        );
        if (graceFailures.length > 0) {
          this.logger.warn(
            `${graceFailures.length} grace-deadline reminder batch(es) failed`,
          );
        }
      });
    } catch (error) {
      this.handleCronFailure('Subscription reminder cron failed', error);
    }
  }

  @Cron(CRON_SCHEDULES.SUBSCRIPTION_REMINDER_HOURLY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('subscriptions.lapsed-hourly')
  async handleLapsedSubscriptions() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Checking for lapsed subscriptions');
    const now = this.clock.now();

    try {
      // RLS-BYPASS: subscription scheduler runs system-wide without request tenant
      await this.prisma.runUnrestricted(async () => {
        const expiredTrials = await this.prisma.subscription.findMany({
          where: {
            currentPeriodEnd: { lt: now },
            status: SubscriptionStatus.TRIALING,
          },
          select: {
            id: true,
          },
        });

        const trialResults = await Promise.allSettled(
          expiredTrials.map((trial) => this.graceUseCase.execute(trial.id)),
        );
        const trialFailures = trialResults.filter(
          (r) => r.status === 'rejected',
        );
        if (trialFailures.length > 0) {
          this.logger.warn(
            `${trialFailures.length} expired trial grace transition(s) failed`,
          );
        }

        if (expiredTrials.length > 0) {
          this.logger.log(
            `Moved ${expiredTrials.length} expired trial subscription(s) into grace (payment required)`,
          );
        }

        const lapsed = await this.prisma.subscription.findMany({
          where: {
            currentPeriodEnd: { lt: now },
            status: { in: ['ACTIVE', 'PAST_DUE'] },
          },
          select: { id: true },
        });

        const lapsedResults = await Promise.allSettled(
          lapsed.map((sub) => this.graceUseCase.execute(sub.id)),
        );
        const lapsedFailures = lapsedResults.filter(
          (r) => r.status === 'rejected',
        );
        if (lapsedFailures.length > 0) {
          this.logger.warn(
            `${lapsedFailures.length} lapsed subscription grace transition(s) failed`,
          );
        }

        const pastGraceDeadline = await this.prisma.subscription.findMany({
          where: {
            status: {
              in: [SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE],
            },
            graceUntil: { not: null, lt: now },
          },
          select: { id: true },
        });

        const expireResults = await Promise.allSettled(
          pastGraceDeadline.map((sub) =>
            this.expireSubscriptionUseCase.execute(sub.id),
          ),
        );
        const expireFailures = expireResults.filter(
          (r) => r.status === 'rejected',
        );
        if (expireFailures.length > 0) {
          this.logger.warn(
            `${expireFailures.length} post-grace subscription expiry(ies) failed`,
          );
        }

        if (pastGraceDeadline.length > 0) {
          this.logger.log(
            `Expired ${pastGraceDeadline.length} subscription(s) after grace deadline (workspace billing lockout)`,
          );
        }
      });
    } catch (error) {
      this.handleCronFailure('Lapsed subscription cron failed', error);
    }
  }
}
