import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { NotifySubscriptionGraceDeadlineUseCase } from '@/domains/subscriptions/application/use-cases/notify-subscription-grace-deadline.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus } from '@workspace/db';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);
  private databaseAccessDisabled = false;
  constructor(
    private readonly notifyUseCase: NotifyExpiringSubscriptionsUseCase,
    private readonly notifyGraceDeadlineUseCase: NotifySubscriptionGraceDeadlineUseCase,
    private readonly graceUseCase: EnterGracePeriodUseCase,
    private readonly prisma: PrismaService,
    private readonly adminAlerts: AdminAlertsService,
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

  private logCronError(message: string, error: unknown): void {
    if (error instanceof Error) {
      this.logger.error(`${message}: ${error.message}`, error.stack);
      return;
    }

    let serializedError = String(error);
    try {
      serializedError = JSON.stringify(error);
    } catch {}

    this.logger.error(`${message}: ${serializedError}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    disabled: isCronDisabledInThisProcess(),
  })
  async handleReminders() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Running subscription reminder cron');
    const now = new Date();

    const schedules = [
      { days: 14, type: 'expiry_14d' },
      { days: 7, type: 'expiry_7d' },
      { days: 3, type: 'expiry_3d' },
      { days: 1, type: 'expiry_1d' },
    ];

    try {
      const results: Array<
        Awaited<ReturnType<NotifyExpiringSubscriptionsUseCase['execute']>>
      > = [];
      await this.prisma.runUnrestricted(async () => {
        for (const schedule of schedules) {
          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + schedule.days);
          const result = await this.notifyUseCase.execute({
            targetDate,
            reminderType: schedule.type,
          });
          results.push(result);
        }
      });

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
        { offsetDays: 3, type: 'grace_deadline_3d' },
        { offsetDays: 1, type: 'grace_deadline_1d' },
        { offsetDays: 0, type: 'grace_deadline_today' },
      ];
      await this.prisma.runUnrestricted(async () => {
        for (const schedule of graceSchedules) {
          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + schedule.offsetDays);
          await this.notifyGraceDeadlineUseCase.execute({
            targetDate,
            reminderType: schedule.type,
          });
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling subscription scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      this.logCronError('Subscription reminder cron failed', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR, {
    disabled: isCronDisabledInThisProcess(),
  })
  async handleLapsedSubscriptions() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Checking for lapsed subscriptions');
    const now = new Date();

    try {
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

        for (const trial of expiredTrials) {
          await this.graceUseCase.execute(trial.id);
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
        });

        for (const sub of lapsed) {
          await this.graceUseCase.execute(sub.id);
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling subscription scheduler due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      this.logCronError('Lapsed subscription cron failed', error);
    }
  }
}
