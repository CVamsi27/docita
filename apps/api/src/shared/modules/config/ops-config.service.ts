import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';

@Injectable()
export class OpsConfigService {
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
