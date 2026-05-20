import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import {
  OVERAGE_CALCULATION_TOKEN,
  type IOverageCalculation,
} from '@/domains/billing/application/ports';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentLinkProvider,
  DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { TIER_LIMITS } from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import {
  ClinicTier,
  UsageType,
  Role,
  EnterpriseContractStatus,
} from '@workspace/db';
import { OverageInvoiceComposer } from '../../infrastructure/schedulers/overage-invoice.composer';
import { mapOverageKeyToUsageType } from '../../infrastructure/schedulers/usage-key.mapper';

export interface BillMonthlyOveragesParams {
  periodStart: Date;
  periodEnd: Date;
}

@Injectable()
export class BillMonthlyOveragesUseCase {
  private readonly logger = new Logger(BillMonthlyOveragesUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    @Inject(OVERAGE_CALCULATION_TOKEN)
    private readonly overageCalculation: IOverageCalculation,
    private readonly configService: AppConfigService,
    @Inject(DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
    private readonly invoiceComposer: OverageInvoiceComposer,
  ) {}

  async execute(params: BillMonthlyOveragesParams): Promise<void> {
    const { periodStart, periodEnd } = params;
    await this.persistence.runUnrestricted(async () => {
      const activeSubscriptions = await this.persistence.subscription.findMany({
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

      const results = await Promise.allSettled(
        activeSubscriptions.map((sub) =>
          this.processSubscriptionOverage(sub, periodStart, periodEnd),
        ),
      );
      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const sub = activeSubscriptions[index];
          this.logger.error(
            `Overage billing failed for clinic ${sub?.clinicId ?? 'unknown'}`,
            result.reason,
          );
        }
      }
    });
  }

  async processSubscriptionOverage(
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

    let activeContract: Awaited<
      ReturnType<typeof this.persistence.enterpriseContract.findUnique>
    > = null;
    if (tier === ClinicTier.ENTERPRISE) {
      const member = await this.persistence.enterpriseContractMember.findUnique({
        where: { clinicId: sub.clinicId },
      });
      const candidate = member
        ? await this.persistence.enterpriseContract.findUnique({
            where: { id: member.contractId },
          })
        : await this.persistence.enterpriseContract.findFirst({
            where: { primaryClinicId: sub.clinicId },
          });
      if (candidate?.status === EnterpriseContractStatus.ACTIVE) {
        activeContract = candidate;
      }
    }

    const currency = this.invoiceComposer.resolveCurrency(
      activeContract?.currency ?? sub.currency,
    );
    const tierKey = tier as keyof typeof TIER_LIMITS;
    const tierLimits = TIER_LIMITS[tierKey];

    const includedConsultations =
      activeContract?.includedConsultations ??
      sub.includedAppointments ??
      tierLimits.appointments ??
      0;
    const includedUsers =
      activeContract?.includedUsers ??
      sub.includedUsers ??
      tierLimits.users ??
      0;

    const [consultationCount, userCount, whatsappCount] = await Promise.all([
      this.persistence.appointment.count({
        where: {
          clinicId: sub.clinicId,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.persistence.user.count({
        where: {
          clinicId: sub.clinicId,
          ...(tier === ClinicTier.FRONT_DESK
            ? {
                NOT: {
                  AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
                },
              }
            : {}),
        },
      }),
      this.persistence.usageEvent.aggregate({
        where: {
          clinicId: sub.clinicId,
          type: UsageType.WHATSAPP_MESSAGES,
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
    ]);

    const whatsappUsed = whatsappCount._sum.quantity ?? 0;
    const whatsappEligibleTier =
      tier === ClinicTier.ESSENTIAL ||
      tier === ClinicTier.FRONT_DESK ||
      tier === ClinicTier.PROFESSIONAL ||
      tier === ClinicTier.HOSPITAL ||
      tier === ClinicTier.ENTERPRISE
        ? tier
        : null;
    const whatsappIncluded =
      activeContract?.includedWhatsappMessages ??
      (whatsappEligibleTier
        ? getWhatsAppAddonPricingByCurrency(whatsappEligibleTier, currency)
            .includedQuota
        : 0);

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
      rateOverridesCents: activeContract
        ? {
            consultation: activeContract.overageConsultationCents,
            user: activeContract.overageUserCents,
            whatsapp: activeContract.overageWhatsappCents,
            storage: activeContract.overageStorageCents,
          }
        : undefined,
    };

    const result = await this.overageCalculation.calculateOverageCharges(
      sub.clinicId,
      usageData,
    );

    const overageEntries = Object.entries(result.breakdown).filter(
      ([key, breakdown]) =>
        mapOverageKeyToUsageType(key) !== null && breakdown.charge > 0,
    );

    const upsertResults = await Promise.allSettled(
      overageEntries.map(async ([key, breakdown]) => {
        const usageType = mapOverageKeyToUsageType(key)!;
        const usageEntry = usageData.usage[key as keyof typeof usageData.usage];

        await this.persistence.usageRecord.upsert({
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
    const upsertFailures = upsertResults.filter((r) => r.status === 'rejected');
    if (upsertFailures.length > 0) {
      this.logger.warn(
        `${upsertFailures.length} overage usage-record upsert(s) failed for clinic ${sub.clinicId}`,
      );
    }

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
      const currencySymbol = this.invoiceComposer.getCurrencySymbol(
        result.currency,
      );
      this.logger.log(
        `Clinic ${sub.clinicId}: recorded ${overageEntries.length} overage items, ` +
          `total charge ${currencySymbol}${result.totalOverageCharges.toFixed(2)} for ${periodStart.toISOString().slice(0, 7)}`,
      );
    }
  }

  async createOrUpdateOverageInvoicePayment(params: {
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
    const invoiceNumber = this.invoiceComposer.buildOverageInvoiceNumber(
      clinicId,
      periodStart,
    );
    const description = this.invoiceComposer.buildOverageDescription(
      periodStart,
      periodEnd,
      currency,
      breakdown,
    );

    let payment = await this.persistence.subscriptionPayment.upsert({
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
      payment = await this.persistence.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'pending' },
      });
    }

    await this.ensureOveragePaymentLink(payment);
  }

  async ensureOveragePaymentLink(payment: {
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

      await this.persistence.subscriptionPayment.update({
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

  async getBillingContact(clinicId: string): Promise<{
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
  }> {
    const primaryAdmin = await this.persistence.user.findFirst({
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

    const fallbackUser = await this.persistence.user.findFirst({
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

    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    return {
      name: clinic?.name ?? null,
      email: null,
      phoneNumber: null,
    };
  }
}
