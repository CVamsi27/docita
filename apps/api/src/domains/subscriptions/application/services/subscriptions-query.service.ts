import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
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
  ) {}

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
    const tiers = ['STARTER', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE'];
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

  async getSubscriptionDetails(clinicId: string) {
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
    };
  }

  async getPaymentHistory(clinicId: string, limit: number = 20) {
    return this.subscriptionRepo.findPaymentsByClinicId(clinicId, limit);
  }

  async getBillingStatus(clinicId: string) {
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
