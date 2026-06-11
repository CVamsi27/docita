// jscpd:ignore-start
import { Inject, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  type ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

type ReminderBatchResult = {
  reminderType: string;
  matchedSubscriptions: number;
  attemptedClinics: number;
  sent: number;
  failed: number;
};

export type SubscriptionWithClinic = {
  id: string;
  clinicId: string;
  clinic: {
    name: string | null;
    users: Array<{ email: string | null }>;
  } | null;
};

type ReminderCreateRecord = {
  clinicId: string;
  subscriptionId: string;
  type: string;
  channel: string;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
};

export abstract class BaseSubscriptionNotifier {
  // jscpd:ignore-end
  protected readonly logger: Logger;

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    protected readonly subscriptionRepo: ISubscriptionRepository,
    protected readonly emailService: EmailService,
    @Inject(CLOCK_PORT) protected readonly clock: IClock,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected async processReminders<T extends SubscriptionWithClinic>(
    reminderType: string,
    subscriptions: T[],
    buildEmail: (
      sub: T,
      reminderType: string,
    ) => { subject: string; text: string },
    noRecipientErrorMessage: string,
    shouldSkip?: (sub: T) => boolean,
  ): Promise<ReminderBatchResult> {
    if (subscriptions.length === 0) {
      return {
        reminderType,
        matchedSubscriptions: 0,
        attemptedClinics: 0,
        sent: 0,
        failed: 0,
      };
    }

    const reminderCutoff = this.clock.now();
    reminderCutoff.setDate(reminderCutoff.getDate() - 1);

    const clinicIds = Array.from(
      new Set(subscriptions.map((sub) => sub.clinicId)),
    );
    const existingReminderClinicIds =
      await this.subscriptionRepo.findRecentReminderClinicIds({
        clinicIds,
        reminderType,
        reminderCutoff,
      });

    const processedClinicIds = new Set(existingReminderClinicIds);
    const sentAt = this.clock.now();
    const remindersToCreate: ReminderCreateRecord[] = [];

    let attemptedClinics = 0;
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      if (processedClinicIds.has(sub.clinicId)) {
        continue;
      }

      if (shouldSkip?.(sub)) {
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
          errorMessage: noRecipientErrorMessage,
        });
        continue;
      }

      const email = buildEmail(sub, reminderType);

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
      await this.subscriptionRepo.createSubscriptionReminders(
        remindersToCreate,
      );
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
