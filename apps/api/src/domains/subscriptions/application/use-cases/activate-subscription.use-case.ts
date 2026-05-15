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
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';
import {
  finalizePayableAmountPaise,
  SubscriptionCheckoutPricingService,
} from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { RazorpayInvoiceAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-invoice.adapter';

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

type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly configService: AppConfigService,
    private readonly razorpayInvoiceAdapter: RazorpayInvoiceAdapter,
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

    const isSameTier = subscription && subscription.getPlan().equals(tier);
    const isSameCycle =
      subscription && subscription.getBillingCycle().equals(cycle);

    await this.persistActivatedSubscription({
      clinicId: params.clinicId,
      tier,
      cycle,
      listPriceCents,
      subscription,
      creditsConsumed: breakdown.accountCreditsAppliedCents,
      preserveCurrentPeriodEnd:
        !!subscription && isSameCycle === true && !isSameTier,
      surplusCreditCents: breakdown.surplusCreditCents,
    });

    const featureUpdates: Record<string, boolean> = {};
    if (!tier.isStarter()) {
      featureUpdates['WHATSAPP'] = true;
      featureUpdates['PAYMENT_LINKS'] = true;
      featureUpdates['WHATSAPP_REMINDERS'] = true;
    }

    await this.clinicOps.updateTierAndFeatures(
      params.clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      featureUpdates,
    );

    await this.clinicOps.emitUpdate(params.clinicId, {
      clinicId: params.clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      subscriptionGraceUntil: null,
    });

    this.logger.log(
      `Subscription plan applied without payment for clinic ${params.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

  async execute(request: ActivateSubscriptionRequest): Promise<void> {
    // AuditLogged: subscription activation
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
    const payment = (await this.subscriptionRepo.findPaymentByOrderId(
      request.clinicId,
      request.razorpayOrderId,
    )) as SubscriptionPaymentRecord | null;

    if (!payment) {
      throw new BadRequestException('Payment order not found for this clinic');
    }

    if (payment.amountCents !== payableAmount) {
      throw new BadRequestException(
        'Payment amount does not match checkout quote',
      );
    }

    let verifiedAmountCents = request.verifiedAmountCents;
    if (!request.skipPaymentVerification) {
      const verification = await this.paymentGateway.verifyPayment({
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
      });

      if (!verification.verified) {
        throw new BadRequestException('Unable to verify payment');
      }

      if (
        verification.orderId &&
        verification.orderId !== request.razorpayOrderId
      ) {
        throw new BadRequestException('Payment order verification failed');
      }

      verifiedAmountCents = verification.amountCents;
    }

    if (
      verifiedAmountCents !== undefined &&
      verifiedAmountCents !== payment.amountCents
    ) {
      throw new BadRequestException(
        'Payment amount does not match selected plan',
      );
    }

    // Mid-cycle change on the same billing cycle (upgrade or same-tier renewal):
    // preserve the original currentPeriodEnd so the user's billing rhythm
    // doesn't drift. A renewal of the exact same tier resets it (full cycle).
    const isSameTier = subscription && subscription.getPlan().equals(tier);
    const isSameCycle =
      subscription && subscription.getBillingCycle().equals(cycle);
    const preserveCurrentPeriodEnd =
      !!subscription && isSameCycle === true && !isSameTier;

    const saved = await this.persistActivatedSubscription({
      clinicId: request.clinicId,
      tier,
      cycle,
      listPriceCents,
      subscription,
      creditsConsumed: breakdown.accountCreditsAppliedCents,
      preserveCurrentPeriodEnd,
      surplusCreditCents: breakdown.surplusCreditCents,
    });

    const razorpayInvoice = await this.createHostedInvoice({
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

    const featureUpdates: Record<string, boolean> = {};
    if (!tier.isStarter()) {
      featureUpdates['WHATSAPP'] = true;
      featureUpdates['PAYMENT_LINKS'] = true;
      featureUpdates['WHATSAPP_REMINDERS'] = true;
    }

    await this.clinicOps.updateTierAndFeatures(
      request.clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      featureUpdates,
    );

    await this.clinicOps.emitUpdate(request.clinicId, {
      clinicId: request.clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      subscriptionGraceUntil: null,
    });

    this.logger.log(
      `Subscription activated for clinic ${request.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

  private async persistActivatedSubscription(params: {
    clinicId: string;
    tier: ClinicTier;
    cycle: BillingCycle;
    listPriceCents: number;
    subscription: Subscription | null;
    creditsConsumed: number;
    /** When true (mid-cycle upgrade on same cycle), keep the current period end. */
    preserveCurrentPeriodEnd?: boolean;
    /** Surplus from a downgrade where credit > charge; held as account credit. */
    surplusCreditCents?: number;
  }): Promise<Subscription> {
    let subscription = params.subscription;
    const { tier, cycle, listPriceCents } = params;

    if (!subscription) {
      subscription = new Subscription({
        id: crypto.randomUUID(),
        clinicId: params.clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: listPriceCents,
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), cycle),
        autoPayEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });
    } else {
      subscription.deductCreditsApplied(params.creditsConsumed);
      subscription.activatePaidPlan(tier, cycle, listPriceCents, new Date(), {
        preserveCurrentPeriodEnd: params.preserveCurrentPeriodEnd,
      });
      if (params.surplusCreditCents && params.surplusCreditCents > 0) {
        subscription.addAccountCredit(params.surplusCreditCents);
      }
      // Once we apply this activation, any pending scheduled change is moot.
      subscription.clearScheduledPlanChange();
    }

    await this.subscriptionRepo.save(subscription);
    return subscription;
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    if (cycle.isYearly()) {
      end.setFullYear(end.getFullYear() + 1);
    } else if (cycle.isSemiAnnual()) {
      end.setMonth(end.getMonth() + 6);
    } else if (cycle.isQuarterly()) {
      end.setMonth(end.getMonth() + 3);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  /**
   * Creates a Razorpay-hosted invoice for an activated subscription payment.
   * Razorpay generates a GST-compliant PDF + short_url customers can use to
   * download. Best-effort: failures here must not block activation.
   */
  private async createHostedInvoice(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    orderId: string;
    paymentId: string;
    tier: string;
    cycle: string;
  }) {
    try {
      const clinic = await this.clinicOps.getClinicDetails(params.clinicId);
      if (!clinic.razorpayCustomerId) {
        return null;
      }
      return await this.razorpayInvoiceAdapter.createInvoice({
        customerId: clinic.razorpayCustomerId,
        amountCents: params.amountCents,
        currency: params.currency,
        description: `Docita ${params.tier} ${params.cycle} subscription`,
        orderId: params.orderId,
        paymentId: params.paymentId,
        notes: {
          clinicId: params.clinicId,
          tier: params.tier,
          cycle: params.cycle,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Hosted invoice creation failed for clinic ${params.clinicId}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      return null;
    }
  }
}
