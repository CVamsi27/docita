import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import {
  CLINIC_USAGE_PORT_TOKEN,
  type IClinicUsagePort,
} from '@/domains/billing/application/ports';
import type { CurrentUsage } from '@workspace/types';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { StaffNotificationType, NotificationPriority } from '@workspace/db';
import { OverageInvoiceComposer } from '../../infrastructure/schedulers/overage-invoice.composer';

@Injectable()
export class NotifyUsageThresholdsUseCase {
  private readonly logger = new Logger(NotifyUsageThresholdsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    @Inject(CLINIC_USAGE_PORT_TOKEN)
    private readonly clinicUsage: IClinicUsagePort,
    private readonly emailService: EmailService,
    private readonly invoiceComposer: OverageInvoiceComposer,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(): Promise<void> {
    // RLS-BYPASS: subscription billing use cases run in scheduler context
    await this.persistence.runUnrestricted(async () => {
      const activeSubscriptions = await this.persistence.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        select: {
          clinicId: true,
        },
      });

      const results = await Promise.allSettled(
        activeSubscriptions.map(async (sub) => {
          const usage = await this.clinicUsage.getCurrentUsage(sub.clinicId);
          await this.processUsageWarnings(sub.clinicId, usage);
        }),
      );
      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const sub = activeSubscriptions[index];
          this.logger.error(
            `Usage warning check failed for clinic ${sub?.clinicId ?? 'unknown'}`,
            result.reason,
          );
        }
      }
    });
  }

  async processUsageWarnings(
    clinicId: string,
    usage: CurrentUsage,
  ): Promise<void> {
    const periodStart = new Date(usage.period.start);
    const periodEnd = new Date(usage.period.end);
    const periodKey = this.invoiceComposer.getPeriodKey(periodStart);
    const warnings = usage.warnings;

    const channelsByThreshold: Record<80 | 100, Array<'IN_APP' | 'EMAIL'>> = {
      80: ['IN_APP', 'EMAIL'],
      100: ['IN_APP'],
    };

    const warningActions: Array<{
      meter: string;
      threshold: 80 | 100;
      channel: 'IN_APP' | 'EMAIL';
      reminderType: string;
      percentUsed: number;
    }> = [];

    for (const [meter, warning] of Object.entries(warnings)) {
      if (warning.threshold === null) continue;

      const threshold = warning.threshold as 80 | 100;
      const reminderType = `usage_${meter}_${threshold}_${periodKey}`;
      const channels = channelsByThreshold[threshold];

      for (const channel of channels) {
        warningActions.push({
          meter,
          threshold,
          channel,
          reminderType,
          percentUsed: warning.percentUsed,
        });
      }
    }

    if (warningActions.length === 0) {
      return;
    }

    const reminderTypes = Array.from(
      new Set(warningActions.map((action) => action.reminderType)),
    );
    const channels = Array.from(
      new Set(warningActions.map((action) => action.channel)),
    );

    const existingReminders =
      await this.persistence.subscriptionReminder.findMany({
        where: {
          clinicId,
          type: { in: reminderTypes },
          channel: { in: channels },
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
      if (dedupeSet.has(key)) {
        continue;
      }

      dedupeSet.add(key);

      if (action.channel === 'IN_APP') {
        await this.createInAppUsageWarning(
          clinicId,
          action.meter,
          action.threshold,
          action.percentUsed,
          usage,
        );

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

      const sent = await this.sendUsageWarningEmail(
        clinicId,
        action.meter,
        action.threshold,
        action.percentUsed,
      );

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

    if (remindersToCreate.length === 0) {
      return;
    }

    await this.persistence.subscriptionReminder.createMany({
      data: remindersToCreate,
      skipDuplicates: true,
    });
  }

  async createInAppUsageWarning(
    clinicId: string,
    meter: string,
    threshold: 80 | 100,
    percentUsed: number,
    usage: CurrentUsage,
  ): Promise<void> {
    const isUpgradePrompt = threshold === 100;
    const meterLabel = this.invoiceComposer.formatUsageMeterLabel(meter);
    const title = isUpgradePrompt
      ? `Usage limit reached (${meterLabel})`
      : `Usage warning (${meterLabel})`;
    const message = isUpgradePrompt
      ? `You've reached ${Math.round(percentUsed)}% of your ${meterLabel} limit. Service continues without lockout, but overage will be billed at cycle close. Consider upgrading to reduce overage charges.`
      : `You've reached ${Math.round(percentUsed)}% of your ${meterLabel} limit this billing cycle. Overage billing applies beyond included usage.`;

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
          meter,
          threshold,
          percentUsed,
          period: usage.period,
          included: usage.included[meter as keyof typeof usage.included] ?? 0,
          current: usage.usage[meter as keyof typeof usage.usage] ?? 0,
          action: isUpgradePrompt ? 'upgrade_prompt' : 'warning',
        },
      },
    });
  }

  async sendUsageWarningEmail(
    clinicId: string,
    meter: string,
    threshold: 80 | 100,
    percentUsed: number,
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

    const to = admins.map((admin) => admin.email);
    const roundedPercent = Math.round(percentUsed);
    const meterLabel = this.invoiceComposer.formatUsageMeterLabel(meter);
    const subject =
      threshold === 100
        ? `Docita usage alert: ${meterLabel} at ${roundedPercent}%`
        : `Docita usage warning: ${meterLabel} at ${roundedPercent}%`;
    const text =
      threshold === 100
        ? `Your clinic has reached ${roundedPercent}% of the ${meterLabel} limit. Usage is not blocked; overage will be billed at cycle close.`
        : `Your clinic has reached ${roundedPercent}% of the ${meterLabel} limit. Please monitor usage to avoid unexpected overage charges.`;

    try {
      const result = await this.emailService.send({
        to,
        subject,
        text,
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
