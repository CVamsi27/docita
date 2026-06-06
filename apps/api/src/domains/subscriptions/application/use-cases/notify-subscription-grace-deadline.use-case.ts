// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
import { Inject, Injectable } from '@nestjs/common';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import {
  type ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { getUtcDayBounds } from '@/shared/schedule/scheduler-date.util';
import {
  BaseSubscriptionNotifier,
  type SubscriptionWithClinic,
} from './base-subscription-notifier.use-case';

export interface NotifyGraceDeadlineRequest {
  targetDate: Date;
  reminderType: string;
}

export type NotifyGraceDeadlineResult = {
  reminderType: string;
  matchedSubscriptions: number;
  attemptedClinics: number;
  sent: number;
  failed: number;
};

type GraceCandidate = SubscriptionWithClinic & {
  graceUntil: Date | null;
};

@Injectable()
export class NotifySubscriptionGraceDeadlineUseCase extends BaseSubscriptionNotifier {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    subscriptionRepo: ISubscriptionRepository,
    emailService: EmailService,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    super(subscriptionRepo, emailService, clock);
  }

  private buildEmail(sub: GraceCandidate, reminderType: string) {
    const clinicName = sub.clinic?.name ?? `Clinic ${sub.clinicId}`;
    const deadlineLabel = formatDate(
      sub.graceUntil!,
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
    const { startOfDay, endOfDay } = getUtcDayBounds(targetDate);

    const subscriptions = await this.subscriptionRepo.findGraceDeadlineReminderCandidates({
        startOfDay,
        endOfDay,
      });

    return this.processReminders(
      reminderType,
      subscriptions,
      (sub) => this.buildEmail(sub, reminderType),
      'No billing admin email recipients found for clinic',
      (sub) => !sub.graceUntil,
    );
  }
}
