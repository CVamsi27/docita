// Facade that delegates to focused services:
//   - RazorpayConfigService (Razorpay keys + webhook secret)
//   - OpsConfigService      (payment link TTL, ops alert webhook, enterprise pricing flag)
// Consumers can either keep importing from this module (preserves the
// previous surface) or inject the focused service directly.
import { Injectable } from '@nestjs/common';
import { OpsConfigService } from './ops-config.service';
import { RazorpayConfigService } from './razorpay-config.service';

@Injectable()
export class PaymentConfigService {
  constructor(
    private readonly razorpay: RazorpayConfigService,
    private readonly ops: OpsConfigService,
  ) {}

  getRazorpayKeyId(): string {
    return this.razorpay.getRazorpayKeyId();
  }

  getRazorpayKeySecret(): string {
    return this.razorpay.getRazorpayKeySecret();
  }

  getRazorpayWebhookSecret(): string {
    return this.razorpay.getRazorpayWebhookSecret();
  }

  getPaymentLinkTtlMinutes(): number {
    return this.ops.getPaymentLinkTtlMinutes();
  }

  getOpsAlertWebhookUrl(): string {
    return this.ops.getOpsAlertWebhookUrl();
  }

  isEnterpriseContractDynamicPricingEnabled(): boolean {
    return this.ops.isEnterpriseContractDynamicPricingEnabled();
  }
}
