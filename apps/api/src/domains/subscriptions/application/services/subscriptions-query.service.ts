import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  normalizePaymentHistory,
  filterPendingPlanCheckoutMismatches,
  collapseStaleUpgradePendingCheckouts,
} from './subscriptions-payment-history-helpers';
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
} from '@workspace/types';
import {
  Tier,
  FEATURE_TIER_MAP,
} from '@/shared/modules/auth/auth/tier.decorator';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import { PricingService as BillingPricingService } from '@/domains/billing/core/services/pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  getTrialGraceEndsAt,
  getTrialWindowState,
} from '@/shared/modules/auth/utils/trial-window.util';
import { RazorpayInvoiceAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-invoice.adapter';
import { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';

type PaymentHistoryRecord = {
  amountCents: number;
  currency: string;
  status?: string;
  description?: string | null;
  createdAt: Date;
  getStatus?: () => unknown;
};

@Injectable()
export class SubscriptionsQueryService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly pricingService: SubscriptionPricingService,
    private readonly billingPricingService: BillingPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly razorpayInvoiceAdapter: RazorpayInvoiceAdapter,
    private readonly activateSubscriptionUseCase: ActivateSubscriptionUseCase,
  ) {}

  /**
   * Applies any scheduled plan change whose effectiveAt is in the past.
   * Called from read paths so users see the new plan as soon as their period
   * rolls over, without requiring a dedicated cron.
   */
  private async maybeApplyDueScheduledChange(clinicId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription || !subscription.isScheduledChangeDue()) return;
    const scheduled = subscription.scheduledChange!;
    try {
      await this.activateSubscriptionUseCase.applyPlanChangeWithoutPayment({
        clinicId,
        tier: scheduled.plan,
        cycle: scheduled.billingCycle,
      });
    } catch {
      // Best-effort. Don't break the read if the scheduled change can't apply
      // (e.g. tier requires payment); we'll surface the issue via UI next time.
    }
  }

  private getTierData<T extends Record<string, V>, V>(
    source: T,
    key: string,
  ): T[keyof T] | undefined {
    return source[key as keyof T];
  }

  private getTierObject<T extends Record<string, unknown>>(
    source: T,
    key: string,
  ): Record<string, unknown> {
    const value = this.getTierData(source, key);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(Object.entries(value as Record<string, unknown>));
  }

  async getTierConfig() {
    const tiers = [
      'STARTER',
      'FRONT_DESK',
      'ESSENTIAL',
      'PROFESSIONAL',
      'ENTERPRISE',
    ];
    const pricingConfig =
      await this.billingPricingService.getPricingConfig(DEFAULT_CURRENCY);
    const pricingTiers = pricingConfig.tiers as Array<{
      id: string;
      pricing?: unknown;
    }>;
    return {
      tiers: tiers.map((tier) => ({
        id: tier,
        tier: this.getTierData(Tier, tier),
        ...this.getTierObject(TIER_INFO, tier),
        pricing:
          pricingTiers.find((item: { id: string }) => item.id === tier)
            ?.pricing ?? undefined,
        limits: this.getTierData(TIER_LIMITS, tier),
        features: this.getTierData(TIER_FEATURES, tier) || [],
      })),
      featureTierMap: FEATURE_TIER_MAP,
      featureDisplay: FEATURE_DISPLAY,
      intelligenceInfo: {
        ...this.getTierObject(TIER_INFO, 'INTELLIGENCE'),
        pricing:
          pricingTiers.find(
            (item: { id: string }) => item.id === 'INTELLIGENCE',
          )?.pricing ?? undefined,
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
    if (!subscription) {
      return null;
    }
    const tierName = subscription.getPlan().value;

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
      daysRemaining: subscription.getDaysRemaining(),
      scheduledChange: subscription.scheduledChange ?? null,
      accountCreditCents: subscription.getCredits().paise,
    };
  }

  async getPaymentHistory(clinicId: string, limit: number = 20) {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    const currentPlan = subscription ? subscription.getPlan().value : undefined;

    const records = (await this.subscriptionRepo.findPaymentsByClinicId(
      clinicId,
      Math.max(limit * 5, limit),
    )) as PaymentHistoryRecord[];
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
    if (!clinic.razorpayCustomerId) {
      return localRecords;
    }

    const invoices = await this.razorpayInvoiceAdapter.listInvoicesByCustomer(
      clinic.razorpayCustomerId,
    );
    if (!invoices.length) {
      return localRecords;
    }

    const knownInvoiceIds = new Set(
      localRecords
        .map((r) => (r as Record<string, unknown>)['invoiceNumber'])
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
        // Carry through identifiers + hosted URL so the controller can
        // render `invoiceUrl` / `receiptUrl` from Razorpay's hosted PDF.
        ...({
          id: inv.id,
          invoiceUrl: inv.shortUrl ?? undefined,
          invoiceNumber: inv.invoiceNumber ?? undefined,
          paidAt: inv.paidAt ?? undefined,
        } as Partial<PaymentHistoryRecord>),
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
      ? ((await this.subscriptionRepo.findPaymentsByClinicId(
          clinicId,
          1,
        )) as Array<{
          amountCents: number;
          currency: string;
          status?: string;
          createdAt: Date;
          getStatus?: () => unknown;
        }>)
      : [];
    const lastPayment = payments[0];

    const trialEnd = subscription?.trialEnd ?? null;
    const trialWindowState = subscription
      ? getTrialWindowState({
          subscriptionStatus: subscription.getStatus().value,
          trialEnd,
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
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

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
