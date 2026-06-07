import { Injectable, Inject } from '@nestjs/common';
import { SubscriptionStatus } from '@workspace/db';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  type ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { getUtcDayBounds } from '@/shared/schedule/scheduler-date.util';
import {
  BaseSubscriptionNotifier,
  type SubscriptionWithClinic,
} from './base-subscription-notifier.use-case';

export interface NotifyExpiringSubscriptionsRequest {
  targetDate: Date;
  reminderType: string;
}

export type NotifyExpiringSubscriptionsResult = {
  reminderType: string;
  matchedSubscriptions: number;
  attemptedClinics: number;
  sent: number;
  failed: number;
};

type ExpiryCandidate = SubscriptionWithClinic & {
  currentPeriodEnd: Date;
  status: string;
};

@Injectable()
// jscpd:ignore-start
export class NotifyExpiringSubscriptionsUseCase extends BaseSubscriptionNotifier {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    subscriptionRepo: ISubscriptionRepository,
    emailService: EmailService,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    super(subscriptionRepo, emailService, clock);
  }

  private parseDays(reminderType: string): number | null {
// jscpd:ignore-end
    const match = reminderType.match(/expiry_(\d+)d/);
    if (!match) return null;
    const days = Number(match[1]);
    return Number.isFinite(days) ? days : null;
  }

  private buildEmail(sub: ExpiryCandidate, reminderType: string) {
    const days = this.parseDays(reminderType);
    const endDate = formatDate(
      sub.currentPeriodEnd,
      DATE_FORMATS.DATE_WEEKDAY_SHORT_MEDIUM,
    );
    const clinicName = sub.clinic?.name ?? `Clinic ${sub.clinicId}`;
    const isTrial = sub.status === SubscriptionStatus.TRIALING;

    const subject =
      days !== null
        ? days === 0
          ? isTrial
            ? 'Docita trial ends today'
            : 'Docita subscription renews today'
          : isTrial
            ? `Docita trial ends in ${days} day${days === 1 ? '' : 's'}`
            : `Docita subscription renews in ${days} day${days === 1 ? '' : 's'}`
        : isTrial
          ? 'Docita trial ending'
          : 'Docita subscription renewing';

    const intro = isTrial
      ? `Your Docita trial for "${clinicName}" is ending soon.\n` +
        `Trial period end: ${endDate}\n\n` +
        (days !== null && days <= 3
          ? 'Add payment under Settings, Subscription today. After the trial ends without payment, your workspace enters a billing grace period; staff access may pause when that grace period ends.\n'
          : 'Add payment under Settings, Subscription before this date to avoid entering a payment grace period and staff access restrictions.\n')
      : `Your Docita subscription for "${clinicName}" has a billing period ending soon.\n` +
        `Current period end: ${endDate}\n\n` +
        'Ensure payment completes before this date to avoid service interruption.\n';

    const text = intro + 'If you need help, reply to this email.';

    return { subject, text };
  }

  async execute(
    request: NotifyExpiringSubscriptionsRequest,
  ): Promise<NotifyExpiringSubscriptionsResult> {
    const { targetDate, reminderType } = request;
    const { startOfDay, endOfDay } = getUtcDayBounds(targetDate);

    const subscriptions =
      await this.subscriptionRepo.findExpiryReminderCandidates({
        startOfDay,
        endOfDay,
      });

    return this.processReminders(
      reminderType,
      subscriptions,
      (sub) => this.buildEmail(sub, reminderType),
      'No admin email recipients found for clinic',
    );
  }
}
