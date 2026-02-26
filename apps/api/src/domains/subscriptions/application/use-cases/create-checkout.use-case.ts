import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '../ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '../ports/clinic-operations.port';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '../ports/payment-gateway.port';
import { SubscriptionPricingService } from '../../core/services/subscription-pricing.service';
import { ClinicTier, BillingCycle } from '../../core/value-objects';
import { AppConfigService } from '../../../../shared/modules/config/app-configuration.service';

export interface CreateCheckoutRequest {
  clinicId: string;
  tier: string;
  cycle: string;
  referrals?: string[];
  addOns?: string[];
}

export interface CheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
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
    private readonly pricingService: SubscriptionPricingService,
    private readonly configService: AppConfigService,
  ) {}

  async execute(request: CreateCheckoutRequest): Promise<CheckoutResponse> {
    const tier = ClinicTier.fromString(request.tier);
    const cycle = BillingCycle.fromString(request.cycle);
    const addOns = request.addOns || [];

    const clinic = await this.clinicOps.getClinicDetails(request.clinicId);
    let customerId = clinic.razorpayCustomerId;

    if (!customerId) {
      customerId = await this.paymentGateway.createCustomer({
        email: clinic.email,
        name: clinic.name,
        phone: clinic.phone,
        clinicId: clinic.id,
      });
      await this.clinicOps.updateRazorpayCustomerId(clinic.id, customerId);
    }

    const amountCents = this.pricingService.calculatePrice(tier, cycle, addOns);

    const order = await this.paymentGateway.createOrder({
      amountCents,
      currency: 'INR',
      customerId,
      customerEmail: clinic.email,
      customerPhone: clinic.phone,
      orderId: crypto.randomUUID(),
      description: `Docita ${tier.value} - ${cycle.value}`,
      notes: {
        clinicId: request.clinicId,
        tier: request.tier,
        cycle: request.cycle,
        addOns: addOns.join(','),
      },
    });

    await this.subscriptionRepo.savePayment({
      clinicId: request.clinicId,
      amountCents,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.razorpayOrderId,
      description: `${tier.value} ${cycle.value} subscription`,
    });

    return {
      orderId: order.razorpayOrderId,
      amountCents: order.amountCents,
      currency: order.currency,
      razorpayKeyId: this.configService.getRazorpayKeyId() || '',
    };
  }
}
