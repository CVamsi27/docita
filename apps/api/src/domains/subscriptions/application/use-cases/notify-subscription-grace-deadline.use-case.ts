import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { SubscriptionStatus } from '@workspace/db';
import { DATE_FORMATS, formatDate } from '@workspace/utils';

export interface NotifyGraceDeadlineRequest {
  targetDate: Date;
  reminderType: string;
}

export interface NotifyGraceDeadlineResult {
  reminderType: string;
  matchedSubscriptions: number;
  attemptedClinics: number;
  sent: number;
  failed: number;
}

@Injectable()
export class NotifySubscriptionGraceDeadlineUseCase {
  private readonly logger = new Logger(
    NotifySubscriptionGraceDeadlineUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private buildEmail(reminderType: string, clinicName: string, deadline: Date) {
    const deadlineLabel = formatDate(
      deadline,
      DATE_FORMATS.DATE_WEEKDAY_SHORT_MEDIUM,
    );

    let subject = 'Docita billing action needed';
    let body =
      `Your Docita workspace "${clinicName}" has a billing issue.\n` +
      `Payment resolution deadline: ${deadlineLabel}\n\n` +
      'After this deadline, workspace access may be limited for staff accounts until billing is restored.\n' +
      'Organization admins can update billing in Docita under Settings, Subscription.\n\n' +
      'If you need help, reply to this email.';

    if (reminderType === 'grace_deadline_7d') {
      subject = 'Docita subscription: 7 days left to resolve billing';
    } else if (reminderType === 'grace_deadline_3d') {
      subject = 'Docita subscription: 3 days left to resolve billing';
    } else if (reminderType === 'grace_deadline_1d') {
      subject = 'Docita subscription: 1 day left to resolve billing';
    } else if (reminderType === 'grace_deadline_today') {
      subject = 'Docita subscription: billing deadline is today';
      body =
        `Your Docita workspace "${clinicName}" must resolve billing today (${deadlineLabel}).\n\n` +
        'After the deadline, workspace access may be limited for staff accounts until billing is restored.\n' +
        'Organization admins can update billing in Docita under Settings, Subscription.\n\n' +
        'If you need help, reply to this email.';
    }

    return { subject, text: body };
  }

  async execute(
    request: NotifyGraceDeadlineRequest,
  ): Promise<NotifyGraceDeadlineResult> {
    const { targetDate, reminderType } = request;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        graceUntil: { gte: startOfDay, lte: endOfDay },
        status: {
          in: [SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE],
        },
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

      if (!sub.graceUntil) {
        continue;
      }

      processedClinicIds.add(sub.clinicId);

      this.logger.log(
        `Sending grace deadline reminder ${reminderType} to clinic ${sub.clinicId}`,
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
          errorMessage: 'No billing admin email recipients found for clinic',
        });
        continue;
      }

      const clinicName = sub.clinic?.name ?? `Clinic ${sub.clinicId}`;
      const email = this.buildEmail(reminderType, clinicName, sub.graceUntil);

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

    if (remindersToCreate.length > 0) {
      await this.prisma.subscriptionReminder.createMany({
        data: remindersToCreate,
      });
    }

    return {
      reminderType,
      matchedSubscriptions: subscriptions.length,
      attemptedClinics,
      sent,
      failed,
    };
  }
}
