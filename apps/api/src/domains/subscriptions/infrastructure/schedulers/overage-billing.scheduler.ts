import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { OverageCalculationService } from '@/domains/billing/core/services/overage-calculation.service';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentLinkProvider,
  PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import {
  TIER_LIMITS,
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  getWhatsAppAddonPricingByCurrency,
  type SupportedCurrency,
} from '@workspace/types';
import {
  ClinicTier,
  UsageType,
  StaffNotificationType,
  NotificationPriority,
  Role,
} from '@workspace/db';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class OverageBillingScheduler {
  private readonly logger = new Logger(OverageBillingScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly overageCalculationService: OverageCalculationService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
    @Inject(PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
  ) {}

  private resolveCurrency(currency?: string): SupportedCurrency {
    const selected = currency?.toUpperCase() as SupportedCurrency | undefined;
    if (
      selected &&
      Object.prototype.hasOwnProperty.call(PRICING_CURRENCY_CONFIG, selected)
    ) {
      return selected;
    }

    return 'INR';
  }

  private getCurrencySymbol(currency?: string): string {
    const resolved = this.resolveCurrency(currency);
    return PRICING_CURRENCY_SYMBOLS[resolved] ?? resolved;
  }

  private isDatabaseAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';
    return (
      code === 'P1000' ||
      message.includes('authentication failed against the database server') ||
      message.includes('password authentication failed')
    );
  }

  @Cron('0 2 1 * *', { disabled: isCronDisabledInThisProcess() })
  async billMonthlyOverages(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    this.logger.log(
      `Running monthly overage billing for ${periodStart.toISOString().slice(0, 7)}`,
    );

    try {
      await this.prisma.runUnrestricted(async () => {
        const activeSubscriptions = await this.prisma.subscription.findMany({
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          select: {
            id: true,
            clinicId: true,
            plan: true,
            currency: true,
            includedAppointments: true,
            includedUsers: true,
          },
        });

        this.logger.log(
          `Processing overage for ${activeSubscriptions.length} active subscriptions`,
        );

        for (const sub of activeSubscriptions) {
          try {
            await this.processSubscriptionOverage(sub, periodStart, periodEnd);
          } catch (err) {
            this.logger.error(
              `Overage billing failed for clinic ${sub.clinicId}`,
              err,
            );
          }
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling overage scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Monthly overage billing cron failed', error);
    }
  }

  @Cron('30 * * * *', { disabled: isCronDisabledInThisProcess() })
  async notifyUsageThresholds(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    try {
      await this.prisma.runUnrestricted(async () => {
        const activeSubscriptions = await this.prisma.subscription.findMany({
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          select: {
            clinicId: true,
          },
        });

        for (const sub of activeSubscriptions) {
          try {
            const usage = await this.usageTrackingService.getCurrentUsage(
              sub.clinicId,
            );
            await this.processUsageWarnings(sub.clinicId, usage);
          } catch (error) {
            this.logger.error(
              `Usage warning check failed for clinic ${sub.clinicId}`,
              error,
            );
          }
        }
      });
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling usage warning scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('Usage warning cron failed', error);
    }
  }

  private async processSubscriptionOverage(
    sub: {
      id: string;
      clinicId: string;
      plan: ClinicTier;
      currency: string;
      includedAppointments: number | null;
      includedUsers: number | null;
    },
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const tier = sub.plan;
    const currency = this.resolveCurrency(sub.currency);
    const tierKey = tier as keyof typeof TIER_LIMITS;
    const tierLimits = TIER_LIMITS[tierKey];

    const includedConsultations =
      sub.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = sub.includedUsers ?? tierLimits.users ?? 0;

    const [consultationCount, userCount, whatsappCount] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          clinicId: sub.clinicId,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.user.count({
        where: { clinicId: sub.clinicId },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId: sub.clinicId,
          type: UsageType.WHATSAPP_MESSAGES,
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
    ]);

    const whatsappUsed = whatsappCount._sum.quantity ?? 0;
    const whatsappIncluded =
      tier === 'ESSENTIAL' || tier === 'PROFESSIONAL' || tier === 'ENTERPRISE'
        ? getWhatsAppAddonPricingByCurrency(tier, currency).includedQuota
        : 0;

    const usageData = {
      period: { start: periodStart, end: periodEnd },
      usage: {
        consultations: {
          current: consultationCount,
          included: includedConsultations,
          overage: Math.max(0, consultationCount - includedConsultations),
        },
        users: {
          current: userCount,
          included: includedUsers,
          overage: Math.max(0, userCount - includedUsers),
        },
        whatsappMessages: {
          current: whatsappUsed,
          included: whatsappIncluded,
          overage: Math.max(0, whatsappUsed - whatsappIncluded),
        },
      },
      tier,
      currency,
    };

    const result = await this.overageCalculationService.calculateOverageCharges(
      sub.clinicId,
      usageData,
    );

    const overageEntries = Object.entries(result.breakdown).filter(
      ([key, breakdown]) =>
        this.mapKeyToUsageType(key) !== null && breakdown.charge > 0,
    );

    await Promise.all(
      overageEntries.map(async ([key, breakdown]) => {
        const usageType = this.mapKeyToUsageType(key)!;
        const usageEntry = usageData.usage[key as keyof typeof usageData.usage];

        await this.prisma.usageRecord.upsert({
          where: {
            clinicId_type_periodStart: {
              clinicId: sub.clinicId,
              type: usageType,
              periodStart,
            },
          },
          update: {
            quantity: usageEntry?.current ?? 0,
            includedQuota: usageEntry?.included ?? 0,
            overageUnits: breakdown.quantity,
            overageChargeCents: Math.round(breakdown.charge * 100),
            metadata: { subscriptionId: sub.id },
          },
          create: {
            clinicId: sub.clinicId,
            type: usageType,
            periodStart,
            periodEnd,
            quantity: usageEntry?.current ?? 0,
            includedQuota: usageEntry?.included ?? 0,
            overageUnits: breakdown.quantity,
            overageChargeCents: Math.round(breakdown.charge * 100),
            metadata: { subscriptionId: sub.id },
          },
        });
      }),
    );

    if (result.totalOverageCharges > 0) {
      await this.createOrUpdateOverageInvoicePayment({
        clinicId: sub.clinicId,
        subscriptionId: sub.id,
        periodStart,
        periodEnd,
        totalOverageCharges: result.totalOverageCharges,
        currency: result.currency,
        breakdown: result.breakdown,
      });
    }

    if (overageEntries.length > 0) {
      const currencySymbol = this.getCurrencySymbol(result.currency);
      this.logger.log(
        `Clinic ${sub.clinicId}: recorded ${overageEntries.length} overage items, ` +
          `total charge ${currencySymbol}${result.totalOverageCharges.toFixed(2)} for ${periodStart.toISOString().slice(0, 7)}`,
      );
    }
  }

  private mapKeyToUsageType(key: string): UsageType | null {
    const map: Record<string, UsageType> = {
      consultations: UsageType.APPOINTMENTS,
      users: UsageType.USERS,
      whatsappMessages: UsageType.WHATSAPP_MESSAGES,
    };
    return map[key] ?? null;
  }

  private getPeriodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private buildOverageInvoiceNumber(
    clinicId: string,
    periodStart: Date,
  ): string {
    const clinicSuffix = clinicId.slice(-6).toUpperCase();
    const periodCode = `${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
    return `OVG-${periodCode}-${clinicSuffix}`;
  }

  private formatUsageMeterLabel(meterKey: string): string {
    const labels: Record<string, string> = {
      consultations: 'Completed consultations',
      users: 'Team seats',
      whatsappMessages: 'WhatsApp messages',
    };
    return labels[meterKey] ?? meterKey;
  }

  private buildOverageDescription(
    periodStart: Date,
    periodEnd: Date,
    currency: string,
    breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    >,
  ): string {
    const currencySymbol = this.getCurrencySymbol(currency);
    const lineItems = Object.entries(breakdown)
      .filter(([, item]) => item.charge > 0)
      .map(
        ([meter, item]) =>
          `${this.formatUsageMeterLabel(meter)}: ${item.quantity} x ${currencySymbol}${item.rate} = ${currencySymbol}${item.charge.toFixed(2)}`,
      )
      .join(' | ');

    return `Usage overage invoice (${this.getPeriodKey(periodStart)}) ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}.${lineItems ? ` ${lineItems}` : ''}`;
  }

  private async createOrUpdateOverageInvoicePayment(params: {
    clinicId: string;
    subscriptionId: string;
    periodStart: Date;
    periodEnd: Date;
    totalOverageCharges: number;
    currency: string;
    breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    >;
  }): Promise<void> {
    const {
      clinicId,
      subscriptionId,
      periodStart,
      periodEnd,
      totalOverageCharges,
      currency,
      breakdown,
    } = params;

    const amountCents = Math.round(totalOverageCharges * 100);
    const invoiceNumber = this.buildOverageInvoiceNumber(clinicId, periodStart);
    const description = this.buildOverageDescription(
      periodStart,
      periodEnd,
      currency,
      breakdown,
    );

    let payment = await this.prisma.subscriptionPayment.upsert({
      where: {
        clinicId_invoiceNumber: {
          clinicId,
          invoiceNumber,
        },
      },
      update: {
        subscriptionId,
        amountCents,
        currency,
        description,
      },
      create: {
        clinicId,
        subscriptionId,
        amountCents,
        currency,
        status: 'pending',
        invoiceNumber,
        description,
      },
    });

    const normalizedStatus = payment.status.toLowerCase();
    if (normalizedStatus !== 'paid' && normalizedStatus !== 'pending') {
      payment = await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'pending' },
      });
    }

    await this.ensureOveragePaymentLink(payment);
  }

  private async ensureOveragePaymentLink(payment: {
    id: string;
    clinicId: string;
    amountCents: number;
    currency: string;
    status: string;
    invoiceUrl: string | null;
    invoiceNumber: string | null;
    description: string | null;
  }): Promise<void> {
    if (payment.amountCents <= 0) return;
    if (payment.invoiceUrl) return;
    if (payment.status.toLowerCase() !== 'pending') return;
    if (!this.configService.getRazorpayKeyId()) return;
    if (!this.configService.getRazorpayKeySecret()) return;

    const billingContact = await this.getBillingContact(payment.clinicId);
    const callbackUrl = `${this.configService.getFrontendAppUrl().replace(/\/$/, '')}/settings?tab=billing`;

    try {
      const link = await this.paymentLinkProvider.createPaymentLink({
        amount: Money.fromCents(payment.amountCents, payment.currency),
        description:
          payment.description ??
          `Subscription usage overage ${payment.invoiceNumber ?? payment.id}`,
        customer: {
          name:
            billingContact.name ??
            `Clinic ${payment.clinicId.slice(-6).toUpperCase()}`,
          email: billingContact.email ?? undefined,
          phone: billingContact.phoneNumber ?? undefined,
        },
        callbackUrl,
        metadata: {
          source: 'subscription_overage',
          clinicId: payment.clinicId,
          subscriptionPaymentId: payment.id,
          invoiceNumber: payment.invoiceNumber ?? '',
        },
      });

      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          invoiceUrl: link.shortUrl || link.url,
          razorpayOrderId: link.id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create overage payment link for payment ${payment.id}`,
        error,
      );
    }
  }

  private async getBillingContact(clinicId: string): Promise<{
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
  }> {
    const primaryAdmin = await this.prisma.user.findFirst({
      where: {
        clinicId,
        role: { in: [Role.ADMIN, Role.ADMIN_DOCTOR] },
      },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (primaryAdmin) {
      return primaryAdmin;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      where: { clinicId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackUser) {
      return fallbackUser;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    return {
      name: clinic?.name ?? null,
      email: null,
      phoneNumber: null,
    };
  }

  private async processUsageWarnings(
    clinicId: string,
    usage: Awaited<ReturnType<UsageTrackingService['getCurrentUsage']>>,
  ): Promise<void> {
    const periodStart = new Date(usage.period.start);
    const periodEnd = new Date(usage.period.end);
    const periodKey = this.getPeriodKey(periodStart);
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

    const existingReminders = await this.prisma.subscriptionReminder.findMany({
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
          sentAt: new Date(),
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
        sentAt: sent ? new Date() : null,
        errorMessage: sent
          ? null
          : 'Failed to deliver usage warning email to clinic admins',
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

  private async createInAppUsageWarning(
    clinicId: string,
    meter: string,
    threshold: 80 | 100,
    percentUsed: number,
    usage: Awaited<ReturnType<UsageTrackingService['getCurrentUsage']>>,
  ): Promise<void> {
    const isUpgradePrompt = threshold === 100;
    const meterLabel = this.formatUsageMeterLabel(meter);
    const title = isUpgradePrompt
      ? `Usage limit reached (${meterLabel})`
      : `Usage warning (${meterLabel})`;
    const message = isUpgradePrompt
      ? `You've reached ${Math.round(percentUsed)}% of your ${meterLabel} limit. Service continues without lockout, but overage will be billed at cycle close. Consider upgrading to reduce overage charges.`
      : `You've reached ${Math.round(percentUsed)}% of your ${meterLabel} limit this billing cycle. Overage billing applies beyond included usage.`;

    await this.prisma.staffNotification.create({
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

  private async sendUsageWarningEmail(
    clinicId: string,
    meter: string,
    threshold: 80 | 100,
    percentUsed: number,
  ): Promise<boolean> {
    const admins = await this.prisma.user.findMany({
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
    const meterLabel = this.formatUsageMeterLabel(meter);
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
