import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { EmailConfigService } from './email-config.service';
import { SmsConfigService } from './sms-config.service';
import { WhatsappConfigService } from './whatsapp-config.service';
import { validateEnv } from './app-config';
import { EnvConfigStore } from './env-config.store';

const ENV_KEYS_TO_RESET = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'ZEPTOMAIL_SENDMAIL_TOKEN',
  'ZEPTOMAIL_API_URL',
  'ZEPTOMAIL_WEBHOOK_SECRET',
  'EMAIL_FROM',
  'SMS_API_KEY',
  'SMS_SENDER_ID',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
  'META_BUSINESS_ACCOUNT_ID',
  'META_APP_SECRET',
  'META_VERIFY_TOKEN',
  'WHATSAPP_PRODUCTION_MODE',
  'WHATSAPP_PER_CLINIC_SENDER_ENABLED',
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
  // Required for `validateEnv` to succeed
  process.env.NODE_ENV ??= 'test';
  process.env.JWT_SECRET ??= 'a'.repeat(48);
  process.env.ENCRYPTION_KEY ??= 'b'.repeat(64);
  validateEnv();
}

describe('EmailConfigService', () => {
  let service: EmailConfigService;

  beforeEach(() => {
    service = new EmailConfigService();
  });

  it('returns SMTP config from env', () => {
    reloadEnv({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    });
    expect(service.getSmtpConfig()).toEqual({
      host: 'smtp.example.com',
      port: 587,
      user: 'user',
      pass: 'pass',
    });
  });

  it('defaults SMTP user/pass to empty string when missing', () => {
    reloadEnv({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587' });
    expect(service.getSmtpConfig().user).toBe('');
    expect(service.getSmtpConfig().pass).toBe('');
  });

  it('returns ZeptoMail token or empty string when missing', () => {
    reloadEnv({ ZEPTOMAIL_SENDMAIL_TOKEN: 'token-123' });
    expect(service.getZeptoMailSendMailToken()).toBe('token-123');

    reloadEnv({});
    expect(service.getZeptoMailSendMailToken()).toBe('');
  });

  it('returns email from env', () => {
    reloadEnv({ EMAIL_FROM: 'noreply@example.com' });
    expect(service.getEmailFrom()).toBe('noreply@example.com');
  });

  it('derives email sender domain from EMAIL_FROM', () => {
    reloadEnv({ EMAIL_FROM: 'noreply@docita.work' });
    expect(service.getEmailSenderDomain()).toBe('docita.work');
  });
});

describe('SmsConfigService', () => {
  let service: SmsConfigService;

  beforeEach(() => {
    service = new SmsConfigService();
  });

  it('returns SMS config from env', () => {
    reloadEnv({ SMS_API_KEY: 'key-123', SMS_SENDER_ID: 'DOCITA' });
    expect(service.getSmsConfig()).toEqual({
      apiKey: 'key-123',
      senderId: 'DOCITA',
    });
  });

  it('defaults API key and sender id to empty string when missing', () => {
    reloadEnv({});
    expect(service.getSmsConfig()).toEqual({ apiKey: '', senderId: '' });
  });
});

describe('WhatsappConfigService', () => {
  let service: WhatsappConfigService;

  beforeEach(() => {
    service = new WhatsappConfigService();
  });

  it('returns Meta config from env', () => {
    reloadEnv({
      META_ACCESS_TOKEN: 'meta-token',
      META_PHONE_NUMBER_ID: 'phone-123',
      META_BUSINESS_ACCOUNT_ID: 'biz-1',
      META_APP_SECRET: 'app-secret',
      META_VERIFY_TOKEN: 'verify-token',
      WHATSAPP_PRODUCTION_MODE: 'true',
    });
    expect(service.getMetaConfig()).toEqual({
      accessToken: 'meta-token',
      phoneNumberId: 'phone-123',
      businessAccountId: 'biz-1',
      appSecret: 'app-secret',
      verifyToken: 'verify-token',
      productionMode: true,
    });
  });

  it('reads per-clinic sender flag', () => {
    reloadEnv({ WHATSAPP_PER_CLINIC_SENDER_ENABLED: 'true' });
    expect(service.isPerClinicWhatsappSenderEnabled()).toBe(true);

    reloadEnv({});
    expect(service.isPerClinicWhatsappSenderEnabled()).toBe(false);
  });
});
