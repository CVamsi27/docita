import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { ExpireSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/expire-subscription.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly notifyUseCase: NotifyExpiringSubscriptionsUseCase,
    private readonly expireUseCase: ExpireSubscriptionUseCase,
    private readonly graceUseCase: EnterGracePeriodUseCase,
    private readonly prisma: PrismaService,
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

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleReminders() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Running subscription reminder cron');
    const now = new Date();

    const schedules = [
      { days: 7, type: 'expiry_7d' },
      { days: 3, type: 'expiry_3d' },
      { days: 1, type: 'expiry_1d' },
    ];

    try {
      await this.prisma.runUnrestricted(async () => {
        for (const schedule of schedules) {
          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + schedule.days);
          await this.notifyUseCase.execute({
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleLapsedSubscriptions() {
    if (this.databaseAccessDisabled) {
      return;
    }

    this.logger.debug('Checking for lapsed subscriptions');
    const now = new Date();

    try {
      await this.prisma.runUnrestricted(async () => {
        const lapsed = await this.prisma.subscription.findMany({
          where: {
            currentPeriodEnd: { lt: now },
            status: { in: ['ACTIVE', 'PAST_DUE'] },
          },
        });

        for (const sub of lapsed) {
          await this.graceUseCase.execute(sub.id);
        }

        const graceExpired = await this.prisma.subscription.findMany({
          where: {
            currentPeriodEnd: {
              lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            },
            status: 'GRACE',
          },
        });

        for (const sub of graceExpired) {
          await this.expireUseCase.execute(sub.id);
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
