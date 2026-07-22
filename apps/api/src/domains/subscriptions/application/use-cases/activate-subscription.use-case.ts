import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { SubscriptionBillingSnapshotService } from '@/domains/subscriptions/application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionPaymentService } from '@/domains/subscriptions/application/services/activate-subscription-payment.service';
import { ActivateSubscriptionClinicSyncService } from '@/domains/subscriptions/application/services/activate-subscription-clinic-sync.service';
import { ActivateSubscriptionPricingResolver } from '@/domains/subscriptions/application/services/activate-subscription-pricing.resolver';
import { ReferralService } from '@/domains/subscriptions/core/services/referral.service';
import type { PlatformInvoiceSummary } from '@/domains/payments/core/ports/platform-invoice-provider.port';

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
    private readonly pricingResolver: ActivateSubscriptionPricingResolver,
    private readonly billingSnapshot: SubscriptionBillingSnapshotService,
    private readonly activationPayment: ActivateSubscriptionPaymentService,
    private readonly clinicSync: ActivateSubscriptionClinicSyncService,
    private readonly referralService: ReferralService,
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
    const pricing = await this.pricingResolver.resolve(
      request.clinicId,
      tier,
      cycle,
    );

    const { payment } =
      await this.activationPayment.resolvePaymentForActivation({
        clinicId: request.clinicId,
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
        payableAmountPaise: pricing.payableAmountPaise,
        subscriptionPaymentId: request.subscriptionPaymentId,
        skipPaymentVerification: request.skipPaymentVerification,
        verifiedAmountCents: request.verifiedAmountCents,
      });

    const saved = await this.billingSnapshot.persistActivatedSubscription({
      clinicId: request.clinicId,
      tier,
      cycle,
      listPriceCents: pricing.listPriceCents,
      subscription: pricing.subscription,
      creditsConsumed: pricing.creditsConsumed,
      preserveCurrentPeriodEnd: pricing.preserveCurrentPeriodEnd,
      surplusCreditCents: pricing.surplusCreditCents,
    });

    const razorpayInvoice = await this.billingSnapshot.createHostedInvoice({
      clinicId: request.clinicId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      orderId: request.razorpayOrderId || payment.razorpayOrderId || payment.id,
      paymentId: request.razorpayPaymentId,
      tier: tier.value,
      cycle: cycle.value,
    });

    await this.markPaymentPaid(request, saved.id, razorpayInvoice);
    await this.clinicSync.syncAfterActivation(
      request.clinicId,
      tier,
      request.planMode,
    );

    // Realize any referral on the first successful payment (non-fatal, idempotent).
    await this.referralService.realizeReferralOnFirstPayment(request.clinicId);

    this.logger.log(
      `Subscription activated for clinic ${request.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

  /**
   * Routes the post-activation status update to the correct repo method
   * based on whether we have a `subscriptionPaymentId` (payment-link
   * resume rows) or only a Razorpay `orderId` (the normal checkout path).
   */
  private async markPaymentPaid(
    request: ActivateSubscriptionRequest,
    subscriptionId: string,
    razorpayInvoice: PlatformInvoiceSummary | null,
  ): Promise<void> {
    const paidDetails = {
      paymentId: request.razorpayPaymentId,
      signature: request.razorpaySignature,
      subscriptionId,
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
      return;
    }
    await this.subscriptionRepo.updatePaymentStatus(
      request.razorpayOrderId,
      'paid',
      paidDetails,
    );
  }
}
