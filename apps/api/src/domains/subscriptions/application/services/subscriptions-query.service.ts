import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_INFO,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
  INTELLIGENCE_ADDON_PRICING,
} from '@workspace/types';
import {
  Tier,
  FEATURE_TIER_MAP,
} from '@/shared/modules/auth/auth/tier.decorator';
import { DEFAULT_CURRENCY } from '@workspace/utils';

@Injectable()
export class SubscriptionsQueryService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly pricingService: SubscriptionPricingService,
  ) {}

  private getTierData<T extends Record<string, unknown>>(
    source: T,
    key: string,
  ): unknown {
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

    return Object.fromEntries(Object.entries(value));
  }

  getTierConfig() {
    const tiers = ['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE'];
    const intelligenceFeatures = [
      'AI prescription assistant',
      'Diagnosis suggestions (non-clinical)',
      'Smart task automation',
      'Predictive no-show model',
      'Patient risk segmentation',
      'Anomaly detection in analytics',
      'Voice-to-text dictation',
    ];

    return {
      tiers: tiers.map((tier) => ({
        id: tier,
        tier: this.getTierData(Tier, tier),
        ...this.getTierObject(TIER_INFO, tier),
        pricing: this.getTierData(TIER_PRICING, tier),
        limits: this.getTierData(TIER_LIMITS, tier),
        features: this.getTierData(TIER_FEATURES, tier) || [],
      })),
      featureTierMap: FEATURE_TIER_MAP,
      featureDisplay: FEATURE_DISPLAY,
      intelligenceAddons: INTELLIGENCE_ADDONS,
      intelligenceBundleDiscount: INTELLIGENCE_BUNDLE_DISCOUNT,
      intelligenceInfo: {
        ...this.getTierObject(TIER_INFO, 'INTELLIGENCE'),
        pricing: this.getTierData(TIER_PRICING, 'INTELLIGENCE'),
        features: intelligenceFeatures,
      },
      addOns: [
        {
          id: 'INTELLIGENCE',
          name: 'Docita Intelligence',
          description: 'AI-powered clinical assistant add-on',
          pricing: INTELLIGENCE_ADDON_PRICING,
        },
      ],
    };
  }

  async getSubscriptionDetails(clinicId: string) {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) {
      return null;
    }

    const clinic = await this.clinicOps.getClinicDetails(clinicId);

    return {
      id: subscription.id,
      clinicId: subscription.clinicId,
      plan: subscription.getPlan().value,
      status: subscription.getStatus().value,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysRemaining: subscription.getDaysRemaining(),
      clinic: {
        id: clinic.id,
        name: clinic.name,
        tier: subscription.getPlan().value,
      },
    };
  }

  async getPaymentHistory(clinicId: string, limit: number = 20) {
    return this.subscriptionRepo.findPaymentsByClinicId(clinicId, limit);
  }

  async getUpcomingInvoice(clinicId: string) {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const pricePaise = this.pricingService.calculatePrice(
      subscription.getPlan(),
      subscription.getBillingCycle(),
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
