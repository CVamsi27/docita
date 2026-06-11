import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { PENDING_CHECKOUT_REUSE_WINDOW_MINUTES } from '@/domains/subscriptions/application/constants/pending-checkout.constants';
import type {
  BillingCycle,
  ClinicTier,
} from '@/domains/subscriptions/core/value-objects';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  buildCheckoutDescription,
  buildCheckoutOrderNotes,
  type CreateCheckoutRequest,
  type CheckoutResponse,
} from '@/domains/subscriptions/application/services/create-checkout.helpers';
import type { resolveSubscriptionBillingContact } from '@workspace/utils';

type CheckoutClinic = {
  id: string;
  razorpayCustomerId?: string | null;
};

type ResolvedSubscriptionBillingContact = ReturnType<
  typeof resolveSubscriptionBillingContact
>;

@Injectable()
export class CheckoutPaymentOrderService {
  private readonly logger = new Logger(CheckoutPaymentOrderService.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly configService: AppConfigService,
  ) {}

  async createPayableCheckout(input: {
    request: CreateCheckoutRequest;
    clinic: CheckoutClinic;
    tier: ClinicTier;
    cycle: BillingCycle;
    amountCents: number;
    currencyCode: string;
    razorpayContact: ResolvedSubscriptionBillingContact;
    checkoutPrefill: CheckoutResponse['prefill'];
    pricingOfferTitle?: string;
  }): Promise<CheckoutResponse> {
    const customerId = await this.ensureCustomer(input);
    const description = buildCheckoutDescription(input.tier, input.cycle);
    const reusable = await this.subscriptionRepo.findReusablePendingCheckout({
      clinicId: input.request.clinicId,
      amountCents: input.amountCents,
      currency: input.currencyCode,
      description,
      withinMinutes: PENDING_CHECKOUT_REUSE_WINDOW_MINUTES,
    });

    if (reusable?.razorpayOrderId) {
      await this.expireOtherPendingCheckouts(
        input.request.clinicId,
        reusable.razorpayOrderId,
      );
      this.logger.log(
        `Reusing pending checkout order ${reusable.razorpayOrderId} for clinic ${input.request.clinicId}`,
      );
      return {
        orderId: reusable.razorpayOrderId,
        amountCents: input.amountCents,
        currency: input.currencyCode,
        razorpayKeyId: this.configService.getRazorpayKeyId() || '',
        prefill: input.checkoutPrefill,
      };
    }

    const order = await this.paymentGateway.createOrder({
      amountCents: input.amountCents,
      currency: input.currencyCode,
      customerId,
      customerEmail: input.razorpayContact.email,
      customerPhone: input.razorpayContact.phone,
      orderId: crypto.randomUUID(),
      description: `Docita ${input.tier.value} - ${input.cycle.value}`,
      notes: buildCheckoutOrderNotes({
        clinicId: input.request.clinicId,
        tier: input.request.tier,
        cycle: input.request.cycle,
        pricingOfferTitle: input.pricingOfferTitle,
      }),
    });

    await this.subscriptionRepo.savePayment({
      clinicId: input.request.clinicId,
      amountCents: input.amountCents,
      currency: input.currencyCode,
      status: 'pending',
      razorpayOrderId: order.razorpayOrderId,
      description,
    });
    await this.expireOtherPendingCheckouts(
      input.request.clinicId,
      order.razorpayOrderId,
    );

    return {
      orderId: order.razorpayOrderId,
      amountCents: input.amountCents,
      currency: order.currency,
      razorpayKeyId: this.configService.getRazorpayKeyId() || '',
      prefill: input.checkoutPrefill,
    };
  }

  private async ensureCustomer(input: {
    clinic: CheckoutClinic;
    razorpayContact: ResolvedSubscriptionBillingContact;
  }): Promise<string> {
    const customerId = input.clinic.razorpayCustomerId;
    if (!customerId) {
      const createdId = await this.paymentGateway.createCustomer({
        email: input.razorpayContact.email,
        name: input.razorpayContact.name,
        phone: input.razorpayContact.phone,
        clinicId: input.clinic.id,
      });
      await this.clinicOps.updateRazorpayCustomerId(input.clinic.id, createdId);
      return createdId;
    }

    await this.paymentGateway.updateCustomer(customerId, {
      email: input.razorpayContact.email,
      name: input.razorpayContact.name,
      phone: input.razorpayContact.phone,
      clinicId: input.clinic.id,
    });
    return customerId;
  }

  private async expireOtherPendingCheckouts(
    clinicId: string,
    keepOrderId: string,
  ): Promise<void> {
    await this.subscriptionRepo.expireOtherPendingSubscriptionCheckouts({
      clinicId,
      keepOrderId,
    });
  }
}
