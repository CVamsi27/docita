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
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';
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
import { PENDING_CHECKOUT_REUSE_WINDOW_MINUTES } from '@/domains/subscriptions/application/constants/pending-checkout.constants';
import { resolveSubscriptionBillingContact } from '@workspace/utils';

export interface CreateCheckoutRequest {
  clinicId: string;
  tier: string;
  cycle: string;
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: string;
  referrals?: string[];
}

export interface CheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
  completedWithoutPayment?: boolean;
  prefill?: {
    name: string;
    email: string;
    contact?: string;
  };
}

@Injectable()
export class CreateCheckoutUseCase {
  private readonly logger = new Logger(CreateCheckoutUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly checkoutPricing: SubscriptionCheckoutPricingService,
    private readonly applyPlanChangeWithoutPayment: ApplyPlanChangeWithoutPaymentUseCase,
    private readonly configService: AppConfigService,
    private readonly featureFlagService: FeatureFlagService,
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
    const checkoutPrefill = {
      name: razorpayContact.name,
      email: razorpayContact.email,
      ...(razorpayContact.phone ? { contact: razorpayContact.phone } : {}),
    };
    let customerId = clinic.razorpayCustomerId;
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
    const amountCents = finalizePayableAmountPaise(
      breakdown.finalAmountCents,
      currencyCode,
    );

    if (amountCents === 0) {
      await this.applyPlanChangeWithoutPayment.execute({
        clinicId: request.clinicId,
        tier: tier.value,
        cycle: cycle.value,
        planMode: request.planMode,
      });
      return {
        orderId: '',
        amountCents: 0,
        currency: currencyCode,
        razorpayKeyId: this.configService.getRazorpayKeyId() || '',
        completedWithoutPayment: true,
        prefill: checkoutPrefill,
      };
    }

    if (!customerId) {
      customerId = await this.paymentGateway.createCustomer({
        email: razorpayContact.email,
        name: razorpayContact.name,
        phone: razorpayContact.phone,
        clinicId: clinic.id,
      });
      await this.clinicOps.updateRazorpayCustomerId(clinic.id, customerId);
    } else {
      await this.paymentGateway.updateCustomer(customerId, {
        email: razorpayContact.email,
        name: razorpayContact.name,
        phone: razorpayContact.phone,
        clinicId: clinic.id,
      });
    }

    const description = `${tier.value} ${cycle.value} subscription`;
    const reusable = await this.subscriptionRepo.findReusablePendingCheckout({
      clinicId: request.clinicId,
      amountCents,
      currency: currencyCode,
      description,
      withinMinutes: PENDING_CHECKOUT_REUSE_WINDOW_MINUTES,
    });
    if (reusable?.razorpayOrderId) {
      await this.subscriptionRepo.expireOtherPendingSubscriptionCheckouts({
        clinicId: request.clinicId,
        keepOrderId: reusable.razorpayOrderId,
      });
      this.logger.log(
        `Reusing pending checkout order ${reusable.razorpayOrderId} for clinic ${request.clinicId}`,
      );
      return {
        orderId: reusable.razorpayOrderId,
        amountCents,
        currency: currencyCode,
        razorpayKeyId: this.configService.getRazorpayKeyId() || '',
        prefill: checkoutPrefill,
      };
    }

    const order = await this.paymentGateway.createOrder({
      amountCents,
      currency: currencyCode,
      customerId,
      customerEmail: razorpayContact.email,
      customerPhone: razorpayContact.phone,
      orderId: crypto.randomUUID(),
      description: `Docita ${tier.value} - ${cycle.value}`,
      notes: {
        clinicId: request.clinicId,
        tier: request.tier,
        cycle: request.cycle,
        pricingOffer: clinicOffer?.title ?? '',
      },
    });

    await this.subscriptionRepo.savePayment({
      clinicId: request.clinicId,
      amountCents,
      currency: currencyCode,
      status: 'pending',
      razorpayOrderId: order.razorpayOrderId,
      description,
    });
    await this.subscriptionRepo.expireOtherPendingSubscriptionCheckouts({
      clinicId: request.clinicId,
      keepOrderId: order.razorpayOrderId,
    });

    return {
      orderId: order.razorpayOrderId,
      amountCents,
      currency: order.currency,
      razorpayKeyId: this.configService.getRazorpayKeyId() || '',
      prefill: checkoutPrefill,
    };
  }
}
