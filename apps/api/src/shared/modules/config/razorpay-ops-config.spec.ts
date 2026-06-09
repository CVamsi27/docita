import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { RazorpayConfigService } from './razorpay-config.service';
import { OpsConfigService } from './ops-config.service';
import { validateEnv } from './app-config';
import { EnvConfigStore } from './env-config.store';

const ENV_KEYS_TO_RESET = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'PAYMENT_LINK_TTL_MINUTES',
  'OPS_ALERT_WEBHOOK_URL',
  'ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED',
];

function resetEnv(): void {
  for (const key of ENV_KEYS_TO_RESET) {
    delete process.env[key];
  }
  EnvConfigStore.resetForTests();
  jest.resetModules();
}

function reloadEnv(overrides: Record<string, string>): void {
  resetEnv();
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
  process.env.NODE_ENV ??= 'test';
  process.env.JWT_SECRET ??= 'a'.repeat(48);
  process.env.ENCRYPTION_KEY ??= 'b'.repeat(64);
  validateEnv();
}

describe('RazorpayConfigService', () => {
  let service: RazorpayConfigService;

  beforeEach(() => {
    service = new RazorpayConfigService();
  });

  it('returns Razorpay credentials from env', () => {
    reloadEnv({
      RAZORPAY_KEY_ID: 'rzp_test_123',
      RAZORPAY_KEY_SECRET: 'rzp_secret_abc',
      RAZORPAY_WEBHOOK_SECRET: 'whsec_xyz',
    });
    expect(service.getRazorpayKeyId()).toBe('rzp_test_123');
    expect(service.getRazorpayKeySecret()).toBe('rzp_secret_abc');
    expect(service.getRazorpayWebhookSecret()).toBe('whsec_xyz');
  });

  it('defaults to empty string when Razorpay keys are missing', () => {
    reloadEnv({});
    expect(service.getRazorpayKeyId()).toBe('');
    expect(service.getRazorpayKeySecret()).toBe('');
    expect(service.getRazorpayWebhookSecret()).toBe('');
  });
});

describe('OpsConfigService', () => {
  let service: OpsConfigService;

  beforeEach(() => {
    service = new OpsConfigService();
  });

  it('returns payment link TTL in minutes', () => {
    reloadEnv({ PAYMENT_LINK_TTL_MINUTES: '45' });
    expect(service.getPaymentLinkTtlMinutes()).toBe(45);
  });

  it('returns ops alert webhook URL or empty string', () => {
    reloadEnv({ OPS_ALERT_WEBHOOK_URL: 'https://alerts.example.com/hook' });
    expect(service.getOpsAlertWebhookUrl()).toBe(
      'https://alerts.example.com/hook',
    );

    reloadEnv({});
    expect(service.getOpsAlertWebhookUrl()).toBe('');
  });

  it('reads enterprise contract dynamic pricing flag (defaults false)', () => {
    reloadEnv({});
    expect(service.isEnterpriseContractDynamicPricingEnabled()).toBe(false);
  });
});
