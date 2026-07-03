// jscpd:ignore-start
import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import {
  ClinicTier,
  // jscpd:ignore-end
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { ApplyPlanChangeWithoutPaymentUseCase } from '@/domains/subscriptions/application/use-cases/apply-plan-change-without-payment.use-case';
import { resolveSubscriptionBillingContact } from '@workspace/utils';
import {
  buildCheckoutPrefill,
  buildCompletedWithoutPaymentResponse,
  type CreateCheckoutRequest,
  type CheckoutResponse,
} from '@/domains/subscriptions/application/services/create-checkout.helpers';
import { CheckoutPaymentOrderService } from '@/domains/subscriptions/application/services/checkout-payment-order.service';
import { ReferralService } from '@/domains/subscriptions/core/services/referral.service';

@Injectable()
export class CreateCheckoutUseCase {
  private readonly logger = new Logger(CreateCheckoutUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly checkoutPaymentOrder: CheckoutPaymentOrderService,
    private readonly applyPlanChangeWithoutPayment: ApplyPlanChangeWithoutPaymentUseCase,
    private readonly configService: AppConfigService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly referralService: ReferralService,
  ) {}

  async execute(request: CreateCheckoutRequest): Promise<CheckoutResponse> {
    // AuditLogged: subscription checkout created
    this.logger.log({
      action: 'subscription.checkout-created',
      clinicId: request.clinicId,
      tier: request.tier,
      cycle: request.cycle,
    });

    const tier = ClinicTier.fromString(request.tier);
    const cycle = BillingCycle.fromString(request.cycle);

    const clinic = await this.clinicOps.getClinicDetails(request.clinicId);
    const billingContact = await this.subscriptionRepo.findBillingContact(
      request.clinicId,
    );
    const razorpayContact = resolveSubscriptionBillingContact({
      billingContact,
      clinic,
    });
    const checkoutPrefill = buildCheckoutPrefill(razorpayContact);
    const clinicOffer = await this.featureFlagService.getClinicPricingOffer(
      request.clinicId,
    );
    const offerPercent = clinicOffer?.percentOff ?? 0;

    const currencyCode = this.configService.getCurrencyCode();

    const subscription = await this.subscriptionRepo.findByClinicId(
      request.clinicId,
    );
    const breakdown = this.checkoutPricing.compute(
      subscription,
      tier,
      cycle,
      offerPercent,
    );

    // R0: a first-time checkout (no existing subscription) may redeem a one-time
    // referral discount on this first invoice. Consumption is marked on the first
    // successful payment (ReferralService.applyReferralCreditsOnFirstPayment), so
    // an abandoned checkout keeps the discount available.
    let payableCents = breakdown.finalAmountCents;
    if (!subscription && payableCents > 0) {
      const referralDiscountCents =
        await this.referralService.getRedeemableReferralDiscountCents(
          request.clinicId,
          razorpayContact.email ?? null,
          payableCents,
        );
      payableCents = Math.max(0, payableCents - referralDiscountCents);
    }

    const amountCents = finalizePayableAmountPaise(payableCents, currencyCode);

    if (amountCents === 0) {
      await this.applyPlanChangeWithoutPayment.execute({
        clinicId: request.clinicId,
        tier: tier.value,
        cycle: cycle.value,
        planMode: request.planMode,
      });
      return buildCompletedWithoutPaymentResponse({
        currency: currencyCode,
        razorpayKeyId: this.configService.getRazorpayKeyId() || '',
        prefill: checkoutPrefill,
      });
    }

    return this.checkoutPaymentOrder.createPayableCheckout({
      request,
      clinic,
      tier,
      cycle,
      amountCents,
      currencyCode,
      razorpayContact,
      checkoutPrefill,
      pricingOfferTitle: clinicOffer?.title,
    });
  }
}
