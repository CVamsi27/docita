import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  normalizePaymentHistory,
  filterPendingPlanCheckoutMismatches,
  collapseStaleUpgradePendingCheckouts,
} from './subscriptions-payment-history-helpers';
import {
  parsePaymentHistoryRecords,
  type PaymentHistoryRecord,
} from './subscription-payment-history.types';
import {
  lookupTierObject,
  lookupTierValue,
  parsePricingConfigResponse,
} from './subscription-tier-config.helpers';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import type { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  TIER_LIMITS,
  TIER_INFO,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  PUBLISHED_PLAN_LADDER,
} from '@workspace/types';
import {
  Tier,
  FEATURE_TIER_MAP,
} from '@/shared/modules/auth/auth/tier.decorator';
import {
  DEFAULT_CURRENCY,
  isOutstandingUnpaidSubscriptionPaymentStatus,
} from '@workspace/utils';
import {
  CLINIC_PRICING_QUERY_TOKEN,
  type IClinicPricingQuery,
} from '@/domains/billing/application/ports';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  getTrialGraceEndsAt,
  getTrialWindowState,
} from '@/shared/modules/auth/utils/trial-window.util';
import {
  PLATFORM_INVOICE_PROVIDER_TOKEN,
  type IPlatformInvoiceProvider,
} from '@/domains/payments/core/ports';
import { ApplyPlanChangeWithoutPaymentUseCase } from '@/domains/subscriptions/application/use-cases/apply-plan-change-without-payment.use-case';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class SubscriptionsQueryService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly pricingService: SubscriptionPricingService,
    @Inject(CLINIC_PRICING_QUERY_TOKEN)
    private readonly clinicPricingQuery: IClinicPricingQuery,
    private readonly featureFlagService: FeatureFlagService,
    @Inject(PLATFORM_INVOICE_PROVIDER_TOKEN)
    private readonly platformInvoiceProvider: IPlatformInvoiceProvider,
    private readonly applyPlanChangeWithoutPayment: ApplyPlanChangeWithoutPaymentUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Applies any scheduled plan change whose effectiveAt is in the past.
   * Called from read paths so users see the new plan as soon as their period
   * rolls over, without requiring a dedicated cron.
   */
  private async maybeApplyDueScheduledChange(clinicId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription || !subscription.isScheduledChangeDue(this.clock.now()))
      return;
    const scheduled = subscription.scheduledChange;
    if (!scheduled) {
      return;
    }
    try {
      await this.applyPlanChangeWithoutPayment.execute({
        clinicId,
        tier: scheduled.plan,
        cycle: scheduled.billingCycle,
        planMode: scheduled.planMode,
      });
    } catch {
      // Best-effort. Don't break the read if the scheduled change can't apply
      // (e.g. tier requires payment); we'll surface the issue via UI next time.
    }
  }

  async getTierConfig() {
    const pricingConfig = parsePricingConfigResponse(
      await this.clinicPricingQuery.getPricingConfig(DEFAULT_CURRENCY),
    );
    return {
      tiers: PUBLISHED_PLAN_LADDER.map((tier) => ({
        id: tier,
        tier: lookupTierValue(Tier, tier),
        ...lookupTierObject(TIER_INFO, tier),
        pricing:
          pricingConfig.tiers.find((item) => item.id === tier)?.pricing ??
          undefined,
        limits: lookupTierValue(TIER_LIMITS, tier),
        features: lookupTierValue(TIER_FEATURES, tier) || [],
      })),
      featureTierMap: FEATURE_TIER_MAP,
      featureDisplay: FEATURE_DISPLAY,
      intelligenceInfo: {
        ...lookupTierObject(TIER_INFO, 'INTELLIGENCE'),
        pricing:
          pricingConfig.tiers.find((item) => item.id === 'INTELLIGENCE')
            ?.pricing ?? undefined,
        features: [],
      },
    };
  }

  async getClinicPricingOffer(clinicId: string) {
    return this.featureFlagService.getClinicPricingOffer(clinicId);
  }

  async findSubscriptionEntity(clinicId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findByClinicId(clinicId);
  }

  async getSubscriptionDetails(clinicId: string) {
    await this.maybeApplyDueScheduledChange(clinicId);
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) return null;
    const tierName = subscription.getPlan().value;
    const recentPayments = await this.subscriptionRepo.findPaymentsByClinicId(
      clinicId,
      12,
    );
    const hasOutstandingPendingPayment = parsePaymentHistoryRecords(
      recentPayments,
    ).some((payment) =>
      isOutstandingUnpaidSubscriptionPaymentStatus(payment.status),
    );
    const trialEnd = subscription.trialEnd ?? null;
    const trialWindowState = getTrialWindowState({
      subscriptionStatus: subscription.getStatus().value,
      trialEnd,
      now: this.clock.now(),
    });
    const trialGraceEndsAt = getTrialGraceEndsAt(trialEnd);

    return {
      id: subscription.id,
      clinicId: subscription.clinicId,
      tier: tierName,
      tierName,
      subscriptionStatus: subscription.getStatus().value,
      billingCycle: subscription.getBillingCycle().value,
      basePriceCents: subscription.getBasePrice().paise,
      currency: DEFAULT_CURRENCY,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      daysRemaining: subscription.getDaysRemaining(this.clock.now()),
      trialEnd: trialEnd?.toISOString() ?? null,
      trialWindowState,
      trialGraceEndsAt: trialGraceEndsAt?.toISOString() ?? null,
      scheduledChange: subscription.scheduledChange ?? null,
      accountCreditCents: subscription.getCredits().paise,
      hasOutstandingPendingPayment,
    };
  }

  async getPaymentHistory(
    clinicId: string,
    limit: number = 20,
  ): Promise<PaymentHistoryRecord[]> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    const currentPlan = subscription ? subscription.getPlan().value : undefined;

    const records = parsePaymentHistoryRecords(
      await this.subscriptionRepo.findPaymentsByClinicId(
        clinicId,
        Math.max(limit * 5, limit),
      ),
    );
    const normalized = normalizePaymentHistory(records);
    const collapsed = collapseStaleUpgradePendingCheckouts(normalized);
    const withoutStalePending = filterPendingPlanCheckoutMismatches(
      collapsed,
      currentPlan,
    );

    const merged = await this.mergeRazorpayInvoices(
      clinicId,
      withoutStalePending,
    );

    return merged.slice(0, limit);
  }

  /**
   * Razorpay is the source of truth for invoices. When our local
   * `SubscriptionPayment` table is missing rows (e.g. webhook never landed in
   * dev), we still want to surface anything Razorpay has on file for the
   * clinic's customer. Anything Razorpay shows that we have not already
   * persisted gets appended as a synthetic history row pointing at the
   * Razorpay-hosted invoice URL.
   */
  private async mergeRazorpayInvoices(
    clinicId: string,
    localRecords: PaymentHistoryRecord[],
  ): Promise<PaymentHistoryRecord[]> {
    const clinic = await this.clinicOps.getClinicDetails(clinicId);
    if (!clinic.razorpayCustomerId) return localRecords;

    const invoices = await this.platformInvoiceProvider.listInvoicesByCustomer(
      clinic.razorpayCustomerId,
    );
    if (!invoices.length) return localRecords;

    const knownInvoiceIds = new Set(
      localRecords
        .map((r) => r.invoiceNumber)
        .filter((v): v is string => typeof v === 'string'),
    );

    const synthesized: PaymentHistoryRecord[] = [];
    for (const inv of invoices) {
      if (inv.invoiceNumber && knownInvoiceIds.has(inv.invoiceNumber)) continue;
      if (inv.id && knownInvoiceIds.has(inv.id)) continue;
      synthesized.push({
        amountCents: inv.amountCents,
        currency: inv.currency,
        status: inv.status === 'paid' ? 'paid' : inv.status,
        description: 'Razorpay subscription invoice',
        createdAt: inv.createdAt,
        id: inv.id,
        invoiceUrl: inv.shortUrl ?? undefined,
        invoiceNumber: inv.invoiceNumber ?? undefined,
        paidAt: inv.paidAt ?? undefined,
      });
    }

    return [...localRecords, ...synthesized].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getBillingStatus(clinicId: string) {
    await this.maybeApplyDueScheduledChange(clinicId);
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    const payments = subscription
      ? parsePaymentHistoryRecords(
          await this.subscriptionRepo.findPaymentsByClinicId(clinicId, 1),
        )
      : [];
    const lastPayment = payments[0];

    const trialEnd = subscription?.trialEnd ?? null;
    const trialWindowState = subscription
      ? getTrialWindowState({
          subscriptionStatus: subscription.getStatus().value,
          trialEnd,
          now: this.clock.now(),
        })
      : null;
    const trialGraceEndsAt = getTrialGraceEndsAt(trialEnd);

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.getStatus().value,
            tier: subscription.getPlan().value,
            billingCycle: subscription.getBillingCycle().value,
            basePriceCents: subscription.getBasePrice().paise,
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
            trialEnd: trialEnd ? trialEnd.toISOString() : null,
            trialWindowState,
            trialGraceEndsAt: trialGraceEndsAt
              ? trialGraceEndsAt.toISOString()
              : null,
            scheduledChange: subscription.scheduledChange ?? null,
            accountCreditCents: subscription.getCredits().paise,
          }
        : null,
      referralCredits: 0,
      pendingReferralDiscount: 0,
      lastPayment: lastPayment
        ? {
            amount: lastPayment.amountCents / 100,
            currency: lastPayment.currency,
            date: lastPayment.createdAt.toISOString(),
            status:
              lastPayment.status ?? String(lastPayment.getStatus?.() ?? ''),
          }
        : undefined,
    };
  }

  async getUpcomingInvoice(clinicId: string) {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) throw new NotFoundException('No subscription found');

    const pricingOffer = await this.getClinicPricingOffer(clinicId);
    const pricePaise = this.pricingService.calculatePrice(
      subscription.getPlan(),
      subscription.getBillingCycle(),
      pricingOffer?.percentOff ?? 0,
    );
    const amount = pricePaise / 100;

    return {
      nextDate: subscription.currentPeriodEnd,
      amount: amount,
      currency: DEFAULT_CURRENCY,
      plan: subscription.getPlan().value,
    };
  }
}
