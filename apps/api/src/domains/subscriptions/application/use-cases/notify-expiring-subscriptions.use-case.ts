import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';

export interface NotifyExpiringSubscriptionsRequest {
  targetDate: Date;
  reminderType: string;
}

export interface NotifyExpiringSubscriptionsResult {
  reminderType: string;
  matchedSubscriptions: number;
  attemptedClinics: number;
  sent: number;
  failed: number;
}

@Injectable()
export class NotifyExpiringSubscriptionsUseCase {
  private readonly logger = new Logger(NotifyExpiringSubscriptionsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly _subscriptionRepo: ISubscriptionRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private parseDays(reminderType: string): number | null {
    const match = reminderType.match(/expiry_(\d+)d/);
    if (!match) return null;
    const days = Number(match[1]);
    return Number.isFinite(days) ? days : null;
  }

  private buildEmail(reminderType: string, clinicName: string, end: Date) {
    const days = this.parseDays(reminderType);
    const endDate = end.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const subject =
      days !== null
        ? `Docita subscription expires in ${days} day${days === 1 ? '' : 's'}`
        : 'Docita subscription expiring';

    const text =
      `Your Docita subscription for "${clinicName}" is expiring soon.\n` +
      `Current period end: ${endDate}\n\n` +
      'To avoid interruption, please ensure payment is completed before expiry.\n' +
      'If you need help, reply to this email.';

    return { subject, text };
  }

  async execute(
    request: NotifyExpiringSubscriptionsRequest,
  ): Promise<NotifyExpiringSubscriptionsResult> {
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
              where: { role: { in: ['ADMIN', 'ADMIN_DOCTOR'] } },
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    if (subscriptions.length === 0) {
      return {
        reminderType,
        matchedSubscriptions: 0,
        attemptedClinics: 0,
        sent: 0,
        failed: 0,
      };
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
    const remindersToCreate: Array<{
      clinicId: string;
      subscriptionId: string;
      type: string;
      channel: string;
      status: string;
      sentAt: Date | null;
      errorMessage: string | null;
    }> = [];

    let attemptedClinics = 0;
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      if (processedClinicIds.has(sub.clinicId)) {
        continue;
      }

      processedClinicIds.add(sub.clinicId);
      this.logger.log(
        `Sending reminder ${reminderType} to clinic ${sub.clinicId}`,
      );

      attemptedClinics += 1;

      const to = (sub.clinic?.users ?? [])
        .map((u) => u.email)
        .filter((email): email is string => Boolean(email));

      if (to.length === 0) {
        failed += 1;
        remindersToCreate.push({
          clinicId: sub.clinicId,
          subscriptionId: sub.id,
          type: reminderType,
          channel: 'EMAIL',
          status: 'failed',
          sentAt: null,
          errorMessage: 'No admin email recipients found for clinic',
        });
        continue;
      }

      const clinicName = sub.clinic?.name ?? `Clinic ${sub.clinicId}`;
      const email = this.buildEmail(
        reminderType,
        clinicName,
        sub.currentPeriodEnd,
      );

      try {
        const result = await this.emailService.send({
          to,
          subject: email.subject,
          text: email.text,
        });

        if (result.success) {
          sent += 1;
          remindersToCreate.push({
            clinicId: sub.clinicId,
            subscriptionId: sub.id,
            type: reminderType,
            channel: 'EMAIL',
            status: 'sent',
            sentAt,
            errorMessage: null,
          });
        } else {
          failed += 1;
          remindersToCreate.push({
            clinicId: sub.clinicId,
            subscriptionId: sub.id,
            type: reminderType,
            channel: 'EMAIL',
            status: 'failed',
            sentAt: null,
            errorMessage: result.error ?? 'Email send failed',
          });
        }
      } catch (error) {
        failed += 1;
        remindersToCreate.push({
          clinicId: sub.clinicId,
          subscriptionId: sub.id,
          type: reminderType,
          channel: 'EMAIL',
          status: 'failed',
          sentAt: null,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (remindersToCreate.length === 0) {
      return {
        reminderType,
        matchedSubscriptions: subscriptions.length,
        attemptedClinics: 0,
        sent: 0,
        failed: 0,
      };
    }

    await this.prisma.subscriptionReminder.createMany({
      data: remindersToCreate,
    });

    return {
      reminderType,
      matchedSubscriptions: subscriptions.length,
      attemptedClinics,
      sent,
      failed,
    };
  }
}
