import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatusEnum,
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

export interface ActivateSubscriptionRequest {
  clinicId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: string;
  cycle: string;
  skipPaymentVerification?: boolean;
  verifiedAmountCents?: number;
}

export interface ApplyPlanChangeWithoutPaymentParams {
  clinicId: string;
  tier: string;
  cycle: string;
}

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
    private readonly billingSnapshot: SubscriptionBillingSnapshotService,
    private readonly activationPayment: ActivateSubscriptionPaymentService,
  ) {}

  async applyPlanChangeWithoutPayment(
    params: ApplyPlanChangeWithoutPaymentParams,
  ): Promise<void> {
    const tier = ClinicTier.fromString(params.tier);
    const cycle = BillingCycle.fromString(params.cycle);
    const clinicOffer = await this.featureFlagService.getClinicPricingOffer(
      params.clinicId,
    );
    const offerPercent = clinicOffer?.percentOff ?? 0;
    const currencyCode = this.configService.getCurrencyCode();

    const subscription = await this.subscriptionRepo.findByClinicId(
      params.clinicId,
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

    if (payableAmount !== 0) {
      throw new BadRequestException(
        'This plan change requires payment through checkout',
      );
    }

    const listPriceCents = this.pricingService.calculatePrice(
      tier,
      cycle,
      offerPercent,
    );

    await this.billingSnapshot.persistActivatedSubscription({
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

    await this.syncClinicAfterActivation(params.clinicId, tier);

    this.logger.log(
      `Subscription plan applied without payment for clinic ${params.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

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

    const { payment } = await this.activationPayment.resolvePaymentForActivation(
      {
        clinicId: request.clinicId,
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
        payableAmountPaise: payableAmount,
        skipPaymentVerification: request.skipPaymentVerification,
        verifiedAmountCents: request.verifiedAmountCents,
      },
    );

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

    const razorpayInvoice = await this.billingSnapshot.createHostedInvoice({
      clinicId: request.clinicId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      orderId: request.razorpayOrderId,
      paymentId: request.razorpayPaymentId,
      tier: tier.value,
      cycle: cycle.value,
    });

    await this.subscriptionRepo.updatePaymentStatus(
      request.razorpayOrderId,
      'paid',
      {
        paymentId: request.razorpayPaymentId,
        signature: request.razorpaySignature,
        subscriptionId: saved.id,
        invoiceUrl: razorpayInvoice?.shortUrl ?? undefined,
        invoiceNumber: razorpayInvoice?.invoiceNumber ?? undefined,
      },
    );

    await this.syncClinicAfterActivation(request.clinicId, tier);

    this.logger.log(
      `Subscription activated for clinic ${request.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

  private async syncClinicAfterActivation(
    clinicId: string,
    tier: ClinicTier,
  ): Promise<void> {
    const featureUpdates = this.activationPolicy.buildPaidTierFeatureUpdates(tier);

    await this.clinicOps.updateTierAndFeatures(
      clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      featureUpdates,
    );

    await this.clinicOps.emitUpdate(clinicId, {
      clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      subscriptionGraceUntil: null,
    });
  }
}
