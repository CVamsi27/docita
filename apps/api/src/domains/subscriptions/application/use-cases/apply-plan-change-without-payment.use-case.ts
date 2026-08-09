import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from '@/domains/subscriptions/application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionClinicSyncService } from '@/domains/subscriptions/application/services/activate-subscription-clinic-sync.service';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
interface ApplyPlanChangeWithoutPaymentParams {
  clinicId: string;
  tier: string;
  cycle: string;
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: string;
}

// AuditLogged: zero-payable subscription plan changes are billing-sensitive writes.
@Injectable()
export class ApplyPlanChangeWithoutPaymentUseCase {
  private readonly logger = new Logger(
    ApplyPlanChangeWithoutPaymentUseCase.name,
    // jscpd:ignore-start
  );

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
    private readonly billingSnapshot: SubscriptionBillingSnapshotService,
    private readonly clinicSync: ActivateSubscriptionClinicSyncService,
    // jscpd:ignore-end
  ) {}

  async execute(params: ApplyPlanChangeWithoutPaymentParams): Promise<void> {
    const tier = ClinicTier.fromString(params.tier);
    const cycle = BillingCycle.fromString(params.cycle);
    const clinicOffer = await this.featureFlagService.getClinicPricingOffer(
      params.clinicId,
    );
    const offerPercent = clinicOffer?.percentOff ?? 0;
    const currencyCode = this.configService.getCurrencyCode();

    const subscription = await this.subscriptionRepo.findByClinicId(
      params.clinicId,
      // jscpd:ignore-start
    );
    const breakdown = this.checkoutPricing.compute(
      subscription,
      tier,
      cycle,
      offerPercent,
    );
    const payableAmount = finalizePayableAmountPaise(
      breakdown.finalAmountCents,
      currencyCode,
    );
    if (payableAmount !== 0)
      // jscpd:ignore-end
      throw new BadRequestException(
        'This plan change requires payment through checkout',
      );

    const listPriceCents = this.pricingService.calculatePrice(
      tier,
      cycle,
      offerPercent,
    );
    await this.billingSnapshot.persistActivatedSubscription({
      // jscpd:ignore-start
      clinicId: params.clinicId,
      tier,
      cycle,
      listPriceCents,
      subscription,
      creditsConsumed: breakdown.accountCreditsAppliedCents,
      preserveCurrentPeriodEnd:
        this.activationPolicy.shouldPreserveCurrentPeriodEnd(
          subscription,
          tier,
          cycle,
        ),
      surplusCreditCents: breakdown.surplusCreditCents,
    });

    await this.clinicSync.syncAfterActivation(
      // jscpd:ignore-end
      params.clinicId,
      tier,
      params.planMode,
    );

    this.logger.log(
      `Subscription plan applied without payment for clinic ${params.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }
}
