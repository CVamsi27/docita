import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { ExpireSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/expire-subscription.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);

  constructor(
    private readonly notifyUseCase: NotifyExpiringSubscriptionsUseCase,
    private readonly expireUseCase: ExpireSubscriptionUseCase,
    private readonly graceUseCase: EnterGracePeriodUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleReminders() {
    this.logger.log('Running subscription reminder cron');
    const now = new Date();

    const schedules = [
      { days: 7, type: 'expiry_7d' },
      { days: 3, type: 'expiry_3d' },
      { days: 1, type: 'expiry_1d' },
    ];

    for (const schedule of schedules) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + schedule.days);
      await this.notifyUseCase.execute({
        targetDate,
        reminderType: schedule.type,
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleLapsedSubscriptions() {
    this.logger.log('Checking for lapsed subscriptions');
    const now = new Date();

    const lapsed = await this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { lt: now },
        status: { in: ['ACTIVE', 'TRIALING'] },
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
        status: 'PAST_DUE',
      },
    });

    for (const sub of graceExpired) {
      await this.expireUseCase.execute(sub.id);
    }
  }
}
