/**
 * Payment Gateway Factory
 * Selects appropriate payment gateway based on region/configuration
 */

import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway, PaymentProvider } from './payment-gateway.interface';
import { RazorpaySubscriptionGateway } from './razorpay-subscription.gateway';

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);
  private gateways: Map<PaymentProvider, IPaymentGateway> = new Map();

  constructor(private readonly razorpayGateway: RazorpaySubscriptionGateway) {
    this.gateways.set(PaymentProvider.RAZORPAY, razorpayGateway);
  }

  /**
   * Get the appropriate gateway for a given provider
   */
  getGateway(provider: PaymentProvider): IPaymentGateway {
    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new Error(`Payment provider ${provider} not supported`);
    }
    return gateway;
  }

  /**
   * Get the default gateway based on configuration or region
   * Currently defaults to Razorpay for India
   */
  getDefaultGateway(region?: string): IPaymentGateway {
    // Future: Add region-based logic
    // For now, default to Razorpay (India-first)
    if (region === 'US' || region === 'EU') {
      // Future: return Stripe gateway when implemented
      this.logger.warn(
        `Stripe not yet implemented for region ${region}, falling back to Razorpay`,
      );
    }

    return this.getGateway(PaymentProvider.RAZORPAY);
  }

  /**
   * Get gateway for subscription billing (SaaS)
   */
  getSubscriptionGateway(): IPaymentGateway {
    return this.getGateway(PaymentProvider.RAZORPAY);
  }

  /**
   * List all available payment providers
   */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.gateways.keys());
  }
}
