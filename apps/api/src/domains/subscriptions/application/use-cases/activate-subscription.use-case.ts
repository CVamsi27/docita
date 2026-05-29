import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from '@/domains/subscriptions/application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionPaymentService } from '@/domains/subscriptions/application/services/activate-subscription-payment.service';
import { ActivateSubscriptionClinicSyncService } from '@/domains/subscriptions/application/services/activate-subscription-clinic-sync.service';

export interface ActivateSubscriptionRequest {
  clinicId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: string;
  cycle: string;
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: string;
  /** Razorpay payment-link resume rows may not have an order id. */
  subscriptionPaymentId?: string;
  skipPaymentVerification?: boolean;
  verifiedAmountCents?: number;
}

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
    private readonly billingSnapshot: SubscriptionBillingSnapshotService,
    private readonly activationPayment: ActivateSubscriptionPaymentService,
    private readonly clinicSync: ActivateSubscriptionClinicSyncService,
  ) {}

  // AuditLogged: subscription activation (billing; not patient PHI)
  async execute(request: ActivateSubscriptionRequest): Promise<void> {
    this.logger.log({
      action: 'subscription.activate',
      clinicId: request.clinicId,
      tier: request.tier,
      cycle: request.cycle,
    });

    const tier = ClinicTier.fromString(request.tier);
    const cycle = BillingCycle.fromString(request.cycle);
    const clinicOffer = await this.featureFlagService.getClinicPricingOffer(
      request.clinicId,
    );
    const offerPercent = clinicOffer?.percentOff ?? 0;

    const subscription = await this.subscriptionRepo.findByClinicId(
      request.clinicId,
    );
    const currencyCode = this.configService.getCurrencyCode();
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

    const listPriceCents = this.pricingService.calculatePrice(
      tier,
      cycle,
      offerPercent,
    );

    const { payment } =
      await this.activationPayment.resolvePaymentForActivation({
        clinicId: request.clinicId,
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
        payableAmountPaise: payableAmount,
        subscriptionPaymentId: request.subscriptionPaymentId,
        skipPaymentVerification: request.skipPaymentVerification,
        verifiedAmountCents: request.verifiedAmountCents,
      });

    const saved = await this.billingSnapshot.persistActivatedSubscription({
      clinicId: request.clinicId,
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

    const invoiceOrderRef =
      request.razorpayOrderId || payment.razorpayOrderId || payment.id;
    const razorpayInvoice = await this.billingSnapshot.createHostedInvoice({
      clinicId: request.clinicId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      orderId: invoiceOrderRef,
      paymentId: request.razorpayPaymentId,
      tier: tier.value,
      cycle: cycle.value,
    });

    const paidDetails = {
      paymentId: request.razorpayPaymentId,
      signature: request.razorpaySignature,
      subscriptionId: saved.id,
      invoiceUrl: razorpayInvoice?.shortUrl ?? undefined,
      invoiceNumber: razorpayInvoice?.invoiceNumber ?? undefined,
    };

    if (request.subscriptionPaymentId) {
      await this.subscriptionRepo.updatePaymentStatusById(
        request.clinicId,
        request.subscriptionPaymentId,
        'paid',
        paidDetails,
      );
    } else {
      await this.subscriptionRepo.updatePaymentStatus(
        request.razorpayOrderId,
        'paid',
        paidDetails,
      );
    }

    await this.clinicSync.syncAfterActivation(
      request.clinicId,
      tier,
      request.planMode,
    );

    this.logger.log(
      `Subscription activated for clinic ${request.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }
}
