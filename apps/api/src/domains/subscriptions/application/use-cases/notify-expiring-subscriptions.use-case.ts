import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { PrismaService } from '@/prisma/prisma.service';

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

    if (subscriptions.length === 0) {
      return;
    }

    const reminderCutoff = new Date();
    reminderCutoff.setDate(reminderCutoff.getDate() - 1);

    const clinicIds = Array.from(
      new Set(subscriptions.map((sub) => sub.clinicId)),
    );
    const existingReminders = await this.prisma.subscriptionReminder.findMany({
      where: {
        clinicId: { in: clinicIds },
        type: reminderType,
        sentAt: { gte: reminderCutoff },
      },
      select: { clinicId: true },
    });

    const processedClinicIds = new Set(
      existingReminders.map((reminder) => reminder.clinicId),
    );
    const sentAt = new Date();
    const remindersToCreate = [];

    for (const sub of subscriptions) {
      if (processedClinicIds.has(sub.clinicId)) {
        continue;
      }

      processedClinicIds.add(sub.clinicId);
      this.logger.log(
        `Sending reminder ${reminderType} to clinic ${sub.clinicId}`,
      );

      remindersToCreate.push({
        clinicId: sub.clinicId,
        subscriptionId: sub.id,
        type: reminderType,
        channel: 'EMAIL',
        sentAt,
      });
    }

    if (remindersToCreate.length === 0) {
      return;
    }

    await this.prisma.subscriptionReminder.createMany({
      data: remindersToCreate,
      skipDuplicates: true,
    });
  }
}
