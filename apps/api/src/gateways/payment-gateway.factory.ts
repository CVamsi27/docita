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

  getGateway(provider: PaymentProvider): IPaymentGateway {
    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new Error(`Payment provider ${provider} not supported`);
    }
    return gateway;
  }

  getDefaultGateway(region?: string): IPaymentGateway {
    if (region === 'US' || region === 'EU') {
      this.logger.warn(
        `Stripe not yet implemented for region ${region}, falling back to Razorpay`,
      );
    }

    return this.getGateway(PaymentProvider.RAZORPAY);
  }

  getSubscriptionGateway(): IPaymentGateway {
    return this.getGateway(PaymentProvider.RAZORPAY);
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.gateways.keys());
  }
}
