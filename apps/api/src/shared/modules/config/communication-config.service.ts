import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';
import { getEmailSenderDomainFromEmail } from './app-configuration-values';

@Injectable()
export class CommunicationConfigService {
  getSmtpConfig() {
    const config = getEnv();
    return {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      user: config.SMTP_USER || '',
      pass: config.SMTP_PASS || '',
    };
  }

  getSmsConfig() {
    const config = getEnv();
    return {
      apiKey: config.SMS_API_KEY || '',
      senderId: config.SMS_SENDER_ID || '',
    };
  }

  getZeptoMailSendMailToken(): string {
    return getEnv().ZEPTOMAIL_SENDMAIL_TOKEN || '';
  }

  getZeptoMailApiUrl(): string {
    return getEnv().ZEPTOMAIL_API_URL;
  }

  getZeptoMailWebhookSecret(): string {
    return getEnv().ZEPTOMAIL_WEBHOOK_SECRET || '';
  }

  getEmailSenderDomain(): string {
    return getEmailSenderDomainFromEmail(getEnv().EMAIL_FROM);
  }

  getEmailFrom(): string {
    return getEnv().EMAIL_FROM;
  }

  getMetaConfig() {
    const config = getEnv();
    return {
      accessToken: config.META_ACCESS_TOKEN || '',
      phoneNumberId: config.META_PHONE_NUMBER_ID || '',
      businessAccountId: config.META_BUSINESS_ACCOUNT_ID || '',
      appSecret: config.META_APP_SECRET || '',
      verifyToken: config.META_VERIFY_TOKEN || '',
      productionMode: config.WHATSAPP_PRODUCTION_MODE,
    };
  }

  isPerClinicWhatsappSenderEnabled(): boolean {
    return getEnv().WHATSAPP_PER_CLINIC_SENDER_ENABLED;
  }
}
