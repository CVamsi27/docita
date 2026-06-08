import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { RazorpayConfigService } from './razorpay-config.service';
import { OpsConfigService } from './ops-config.service';
import { PaymentConfigService } from './payment-config.service';

jest.mock('./razorpay-config.service');
jest.mock('./ops-config.service');

describe('PaymentConfigService', () => {
  let service: PaymentConfigService;
  let razorpay: jest.Mocked<RazorpayConfigService>;
  let ops: jest.Mocked<OpsConfigService>;

  beforeEach(() => {
    razorpay =
      new RazorpayConfigService() as jest.Mocked<RazorpayConfigService>;
    ops = new OpsConfigService() as jest.Mocked<OpsConfigService>;
    service = new PaymentConfigService(razorpay, ops);
  });

  it('getRazorpayKeyId delegates to razorpay', () => {
    razorpay.getRazorpayKeyId.mockReturnValue('rzp_key_123');
    expect(service.getRazorpayKeyId()).toBe('rzp_key_123');
  });

  it('getRazorpayKeySecret delegates to razorpay', () => {
    razorpay.getRazorpayKeySecret.mockReturnValue('rzp_secret_456');
    expect(service.getRazorpayKeySecret()).toBe('rzp_secret_456');
  });

  it('getRazorpayWebhookSecret delegates to razorpay', () => {
    razorpay.getRazorpayWebhookSecret.mockReturnValue('whsec_abc');
    expect(service.getRazorpayWebhookSecret()).toBe('whsec_abc');
  });

  it('getPaymentLinkTtlMinutes delegates to ops', () => {
    ops.getPaymentLinkTtlMinutes.mockReturnValue(30);
    expect(service.getPaymentLinkTtlMinutes()).toBe(30);
  });

  it('getOpsAlertWebhookUrl delegates to ops', () => {
    ops.getOpsAlertWebhookUrl.mockReturnValue(
      'https://hooks.example.com/alert',
    );
    expect(service.getOpsAlertWebhookUrl()).toBe(
      'https://hooks.example.com/alert',
    );
  });

  it('isEnterpriseContractDynamicPricingEnabled delegates to ops', () => {
    ops.isEnterpriseContractDynamicPricingEnabled.mockReturnValue(true);
    expect(service.isEnterpriseContractDynamicPricingEnabled()).toBe(true);
  });
});
