import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class PaymentConfigService {
  getRazorpayKeyId(): string {
    return getEnv().RAZORPAY_KEY_ID || '';
  }

  getRazorpayKeySecret(): string {
    return getEnv().RAZORPAY_KEY_SECRET || '';
  }

  getRazorpayWebhookSecret(): string {
    return getEnv().RAZORPAY_WEBHOOK_SECRET || '';
  }

  getPaymentLinkTtlMinutes(): number {
    return getEnv().PAYMENT_LINK_TTL_MINUTES;
  }

  getOpsAlertWebhookUrl(): string {
    return getEnv().OPS_ALERT_WEBHOOK_URL ?? '';
  }

  isEnterpriseContractDynamicPricingEnabled(): boolean {
    return getEnv().ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED;
  }
}
