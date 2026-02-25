import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  ISubscriptionRepository,
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '../ports';
import { SubscriptionPricingService } from '../../core/services/subscription-pricing.service';
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
} from '../../../../shared/modules/auth/auth/tier.decorator';

@Injectable()
export class SubscriptionsQueryService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly pricingService: SubscriptionPricingService,
  ) {}

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
        tier: (Tier as Record<string, unknown>)[tier],
        ...((TIER_INFO as Record<string, unknown>)[tier] as object),
        pricing: (TIER_PRICING as Record<string, unknown>)[tier],
        limits: (TIER_LIMITS as Record<string, unknown>)[tier],
        features: (TIER_FEATURES as Record<string, unknown>)[tier] || [],
      })),
      featureTierMap: FEATURE_TIER_MAP,
      featureDisplay: FEATURE_DISPLAY,
      intelligenceAddons: INTELLIGENCE_ADDONS,
      intelligenceBundleDiscount: INTELLIGENCE_BUNDLE_DISCOUNT,
      intelligenceInfo: {
        ...((TIER_INFO as Record<string, unknown>)['INTELLIGENCE'] as object),
        pricing: (TIER_PRICING as Record<string, unknown>)['INTELLIGENCE'],
        features: intelligenceFeatures,
      },
      addOns: [
        {
          id: 'INTELLIGENCE',
          name: 'Docita Intelligence',
          description: 'AI-powered clinical assistant add-on',
          pricing: INTELLIGENCE_ADDON_PRICING as Record<string, unknown>,
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
      currency: 'INR',
      plan: subscription.getPlan().value,
    };
  }
}
