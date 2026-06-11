import { Inject, Injectable, Logger } from '@nestjs/common';
import { StaffNotificationType, NotificationPriority } from '@workspace/db';
import type { CurrentUsage } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import { OverageInvoiceComposer } from '../../infrastructure/schedulers/overage-invoice.composer';

const USAGE_METERS = [
  'consultations',
  'users',
  'whatsappMessages',
  'aiCredits',
] as const;

type UsageThreshold = 80 | 100;
type UsageWarningChannel = 'IN_APP' | 'EMAIL';

type UsageWarningAction = {
  meter: string;
  threshold: UsageThreshold;
  channel: UsageWarningChannel;
  reminderType: string;
  percentUsed: number;
};

function parseUsageThreshold(value: number | null): UsageThreshold | null {
  if (value === 80 || value === 100) return value;
  return null;
}

function readMeterCounts(
  usage: CurrentUsage,
  meter: string,
): { included: number; current: number } {
  const key = parseStringEnumMember(USAGE_METERS, meter);
  if (!key) {
    return { included: 0, current: 0 };
  }
  return {
    included: usage.included[key],
    current: usage.usage[key],
  };
}

function buildUsageWarningActions(
  usage: CurrentUsage,
  periodKey: string,
): UsageWarningAction[] {
  const channelsByThreshold: Record<UsageThreshold, UsageWarningChannel[]> = {
    80: ['IN_APP', 'EMAIL'],
    100: ['IN_APP'],
  };
  return Object.entries(usage.warnings).flatMap(([meter, warning]) => {
    const threshold = parseUsageThreshold(warning.threshold);
    if (threshold === null) return [];
    const reminderType = `usage_${meter}_${threshold}_${periodKey}`;
    return channelsByThreshold[threshold].map((channel) => ({
      meter,
      threshold,
      channel,
      reminderType,
      percentUsed: warning.percentUsed,
    }));
  });
}

@Injectable()
export class UsageThresholdNotifierService {
  private readonly logger = new Logger(UsageThresholdNotifierService.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    private readonly emailService: EmailService,
    private readonly invoiceComposer: OverageInvoiceComposer,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async processUsageWarnings(
    clinicId: string,
    usage: CurrentUsage,
  ): Promise<void> {
    const periodStart = new Date(usage.period.start);
    const periodEnd = new Date(usage.period.end);
    const periodKey = this.invoiceComposer.getPeriodKey(periodStart);
    const warningActions = buildUsageWarningActions(usage, periodKey);

    if (warningActions.length === 0) {
      return;
    }

    const existingReminders =
      await this.persistence.subscriptionReminder.findMany({
        where: {
          clinicId,
          type: { in: [...new Set(warningActions.map((a) => a.reminderType))] },
          channel: { in: [...new Set(warningActions.map((a) => a.channel))] },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
          type: true,
          channel: true,
        },
      });

    const dedupeSet = new Set(
      existingReminders.map(
        (reminder) => `${reminder.type}:${reminder.channel}`,
      ),
    );
    const remindersToCreate = [];

    for (const action of warningActions) {
      const key = `${action.reminderType}:${action.channel}`;
      if (dedupeSet.has(key)) continue;
      dedupeSet.add(key);

      if (action.channel === 'IN_APP') {
        await this.createInAppUsageWarning(clinicId, action, usage);
        remindersToCreate.push({
          clinicId,
          type: action.reminderType,
          channel: action.channel,
          status: 'sent',
          sentAt: this.clock.now(),
          errorMessage: null,
        });
        continue;
      }

      const sent = await this.sendUsageWarningEmail(clinicId, action);
      remindersToCreate.push({
        clinicId,
        type: action.reminderType,
        channel: action.channel,
        status: sent ? 'sent' : 'failed',
        sentAt: sent ? this.clock.now() : null,
        errorMessage: sent
          ? null
          : 'Failed to deliver usage warning email to clinic admins',
      });
    }

    if (remindersToCreate.length > 0) {
      await this.persistence.subscriptionReminder.createMany({
        data: remindersToCreate,
        skipDuplicates: true,
      });
    }
  }

  private async createInAppUsageWarning(
    clinicId: string,
    action: UsageWarningAction,
    usage: CurrentUsage,
  ): Promise<void> {
    const isUpgradePrompt = action.threshold === 100;
    const meterLabel = this.invoiceComposer.formatUsageMeterLabel(action.meter);
    const title = isUpgradePrompt
      ? `Usage limit reached (${meterLabel})`
      : `Usage warning (${meterLabel})`;
    const message = isUpgradePrompt
      ? `You've reached ${Math.round(action.percentUsed)}% of your ${meterLabel} limit. Service continues without lockout, but overage will be billed at cycle close. Consider upgrading to reduce overage charges.`
      : `You've reached ${Math.round(action.percentUsed)}% of your ${meterLabel} limit this billing cycle. Overage billing applies beyond included usage.`;

    await this.persistence.staffNotification.create({
      data: {
        clinicId,
        type: StaffNotificationType.SYSTEM_ALERT,
        title,
        message,
        priority: isUpgradePrompt
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL,
        data: {
          kind: 'usage_threshold',
          meter: action.meter,
          threshold: action.threshold,
          percentUsed: action.percentUsed,
          period: usage.period,
          ...readMeterCounts(usage, action.meter),
          action: isUpgradePrompt ? 'upgrade_prompt' : 'warning',
        },
      },
    });
  }

  private async sendUsageWarningEmail(
    clinicId: string,
    action: UsageWarningAction,
  ): Promise<boolean> {
    const admins = await this.persistence.user.findMany({
      where: {
        clinicId,
        role: 'ADMIN',
        email: { not: '' },
      },
      select: { email: true, name: true },
    });

    if (admins.length === 0) return false;

    const roundedPercent = Math.round(action.percentUsed);
    const meterLabel = this.invoiceComposer.formatUsageMeterLabel(action.meter);
    const isLimit = action.threshold === 100;

    try {
      const result = await this.emailService.send({
        to: admins.map((admin) => admin.email),
        subject: isLimit
          ? `Docita usage alert: ${meterLabel} at ${roundedPercent}%`
          : `Docita usage warning: ${meterLabel} at ${roundedPercent}%`,
        text: isLimit
          ? `Your clinic has reached ${roundedPercent}% of the ${meterLabel} limit. Usage is not blocked; overage will be billed at cycle close.`
          : `Your clinic has reached ${roundedPercent}% of the ${meterLabel} limit. Please monitor usage to avoid unexpected overage charges.`,
      });
      return !!result.success;
    } catch (error) {
      this.logger.error(
        `Failed to send usage warning email for clinic ${clinicId}`,
        error,
      );
      return false;
    }
  }
}
