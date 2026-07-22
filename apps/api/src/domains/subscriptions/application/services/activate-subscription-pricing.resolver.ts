import { Inject, Injectable } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';

export interface ResolvedActivationPricing {
  subscription: Subscription | null;
  offerPercent: number;
  payableAmountPaise: number;
  listPriceCents: number;
  creditsConsumed: number;
  surplusCreditCents: number;
  preserveCurrentPeriodEnd: boolean;
}

/**
 * Pulled out of ActivateSubscriptionUseCase so the use-case file reads as
 * a flat orchestration of the activation flow. Owns the single-source
 * pricing math: existing subscription, current offer, checkout breakdown,
 * list price, and the activation policy's preserveCurrentPeriodEnd flag.
 */
@Injectable()
export class ActivateSubscriptionPricingResolver {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
  ) {}

  async resolve(
    clinicId: string,
    tier: ClinicTier,
    cycle: BillingCycle,
  ): Promise<ResolvedActivationPricing> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    const clinicOffer =
      await this.featureFlagService.getClinicPricingOffer(clinicId);
    const offerPercent = clinicOffer?.percentOff ?? 0;
    const currencyCode = this.configService.getCurrencyCode();

    const breakdown = this.checkoutPricing.compute(
      subscription,
      tier,
      cycle,
      offerPercent,
    );
    const payableAmountPaise = finalizePayableAmountPaise(
      breakdown.finalAmountCents,
      currencyCode,
    );
    const listPriceCents = this.pricingService.calculatePrice(
      tier,
      cycle,
      offerPercent,
    );
    const preserveCurrentPeriodEnd =
      this.activationPolicy.shouldPreserveCurrentPeriodEnd(
        subscription,
        tier,
        cycle,
      );

    return {
      subscription,
      offerPercent,
      payableAmountPaise,
      listPriceCents,
      creditsConsumed: breakdown.accountCreditsAppliedCents,
      surplusCreditCents: breakdown.surplusCreditCents,
      preserveCurrentPeriodEnd,
    };
  }
}
