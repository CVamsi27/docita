import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '../ports';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface NotifyExpiringSubscriptionsRequest {
  targetDate: Date;
  reminderType: string;
}

@Injectable()
export class NotifyExpiringSubscriptionsUseCase {
  private readonly logger = new Logger(NotifyExpiringSubscriptionsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(request: NotifyExpiringSubscriptionsRequest): Promise<void> {
    const { targetDate, reminderType } = request;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { gte: startOfDay, lte: endOfDay },
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        clinic: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    for (const sub of subscriptions) {
      const existing = await this.prisma.subscriptionReminder.findFirst({
        where: {
          clinicId: sub.clinicId,
          type: reminderType,
          sentAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          },
        },
      });

      if (existing) continue;

      this.logger.log(
        `Sending reminder ${reminderType} to clinic ${sub.clinicId}`,
      );

      await this.prisma.subscriptionReminder.create({
        data: {
          clinicId: sub.clinicId,
          type: reminderType,
          channel: 'EMAIL',
          sentAt: new Date(),
        },
      });
    }
  }
}
