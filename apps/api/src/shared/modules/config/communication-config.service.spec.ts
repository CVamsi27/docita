import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { EmailConfigService } from './email-config.service';
import { SmsConfigService } from './sms-config.service';
import { WhatsappConfigService } from './whatsapp-config.service';
import { CommunicationConfigService } from './communication-config.service';

jest.mock('./email-config.service');
jest.mock('./sms-config.service');
jest.mock('./whatsapp-config.service');

describe('CommunicationConfigService', () => {
  let service: CommunicationConfigService;
  let email: jest.Mocked<EmailConfigService>;
  let sms: jest.Mocked<SmsConfigService>;
  let whatsapp: jest.Mocked<WhatsappConfigService>;

  beforeEach(() => {
    email = new EmailConfigService() as jest.Mocked<EmailConfigService>;
    sms = new SmsConfigService() as jest.Mocked<SmsConfigService>;
    whatsapp =
      new WhatsappConfigService() as jest.Mocked<WhatsappConfigService>;
    service = new CommunicationConfigService(email, sms, whatsapp);
  });

  it('getSmtpConfig delegates to email.getSmtpConfig', () => {
    email.getSmtpConfig.mockReturnValue({
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      pass: 'p',
    });
    expect(service.getSmtpConfig()).toEqual({
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      pass: 'p',
    });
  });

  it('getSmsConfig delegates to sms.getSmsConfig', () => {
    sms.getSmsConfig.mockReturnValue({ apiKey: 'key', senderId: 'sender' });
    expect(service.getSmsConfig()).toEqual({
      apiKey: 'key',
      senderId: 'sender',
    });
  });

  it('getZeptoMailSendMailToken delegates to email', () => {
    email.getZeptoMailSendMailToken.mockReturnValue('token123');
    expect(service.getZeptoMailSendMailToken()).toBe('token123');
  });

  it('getZeptoMailApiUrl delegates to email', () => {
    email.getZeptoMailApiUrl.mockReturnValue('https://api.zeptomail.com');
    expect(service.getZeptoMailApiUrl()).toBe('https://api.zeptomail.com');
  });

  it('getZeptoMailWebhookSecret delegates to email', () => {
    email.getZeptoMailWebhookSecret.mockReturnValue('whsec');
    expect(service.getZeptoMailWebhookSecret()).toBe('whsec');
  });

  it('getEmailSenderDomain delegates to email', () => {
    email.getEmailSenderDomain.mockReturnValue('example.com');
    expect(service.getEmailSenderDomain()).toBe('example.com');
  });

  it('getEmailFrom delegates to email', () => {
    email.getEmailFrom.mockReturnValue('noreply@example.com');
    expect(service.getEmailFrom()).toBe('noreply@example.com');
  });

  it('getMetaConfig delegates to whatsapp', () => {
    const meta = { accessToken: 'abc', phoneNumberId: '123', businessAccountId: 'biz', appSecret: 'secret', verifyToken: 'verify', productionMode: false };
    whatsapp.getMetaConfig.mockReturnValue(meta);
    expect(service.getMetaConfig()).toBe(meta);
  });

  it('isPerClinicWhatsappSenderEnabled delegates to whatsapp', () => {
    whatsapp.isPerClinicWhatsappSenderEnabled.mockReturnValue(true);
    expect(service.isPerClinicWhatsappSenderEnabled()).toBe(true);
  });
});
