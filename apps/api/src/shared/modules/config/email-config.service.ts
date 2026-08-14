import { Injectable } from '@nestjs/common';
import { getEnv } from './app-config';
import { getEmailSenderDomainFromEmail } from './app-configuration-values';

@Injectable()
export class EmailConfigService {
  getSmtpConfig() {
    const config = getEnv();
    return {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      user: config.SMTP_USER || '',
      pass: config.SMTP_PASS || '',
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
}
