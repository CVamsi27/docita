import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  PAYMENT_GATEWAY_TOKEN,
  type IPaymentGateway,
} from '@/domains/subscriptions/application/ports';
import type { OnboardingCheckoutDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';

// AuditLogged: onboarding checkout creation audited in onboarding-compliance workflow

@Injectable()
export class OnboardingPaymentService {
  constructor(
    private readonly dataService: OnboardingDataService,
    private readonly validationService: OnboardingValidationService,
    private readonly configService: AppConfigService,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async createCheckout(onboardingId: string, data: OnboardingCheckoutDto) {
    const sessionData = await this.dataService.getSessionData(onboardingId);
    if (!sessionData)
      throw new BadRequestException('Onboarding session not found or expired');

    const amountCents = this.validationService.getTierPricing(
      data.tier,
      data.billingCycle,
      data.currency,
      data.planMode,
    );

    // GSTIN is optional at onboarding; it is collected later in
    // Settings → Billing before the first paid GST invoice is issued.

    if (amountCents <= 0)
      throw new BadRequestException(
        'Selected plan does not support direct checkout',
      );

    const order = await this.paymentGateway.createOrder({
      amountCents,
      currency: data.currency || this.configService.getCurrencyCode(),
      customerId: `onboarding-${onboardingId}`,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      orderId: crypto.randomUUID(),
      description: `Docita ${data.tier} - ${data.billingCycle}`,
      notes: {
        onboardingId,
        tier: data.tier,
        cycle: data.billingCycle,
        customerName: data.customerName,
      },
    });

    return {
      orderId: order.razorpayOrderId,
      amountCents: order.amountCents,
      currency: order.currency,
      razorpayKeyId: this.configService.getRazorpayKeyId() || '',
    };
  }
}
