// Facade that delegates to focused per-channel services:
//   - EmailConfigService       (SMTP, ZeptoMail, email from/sender domain)
//   - SmsConfigService          (SMS API key + sender id)
//   - WhatsappConfigService     (Meta API config, per-clinic sender flag)
// Consumers can either keep importing from this module (preserves the
// previous surface) or inject the focused service directly.
import { Injectable } from '@nestjs/common';
import { EmailConfigService } from './email-config.service';
import { SmsConfigService } from './sms-config.service';
import { WhatsappConfigService } from './whatsapp-config.service';

@Injectable()
export class CommunicationConfigService {
  constructor(
    private readonly email: EmailConfigService,
    private readonly sms: SmsConfigService,
    private readonly whatsapp: WhatsappConfigService,
  ) {}

  getSmtpConfig() {
    return this.email.getSmtpConfig();
  }

  getSmsConfig() {
    return this.sms.getSmsConfig();
  }

  getZeptoMailSendMailToken(): string {
    return this.email.getZeptoMailSendMailToken();
  }

  getZeptoMailApiUrl(): string {
    return this.email.getZeptoMailApiUrl();
  }

  getZeptoMailWebhookSecret(): string {
    return this.email.getZeptoMailWebhookSecret();
  }

  getEmailSenderDomain(): string {
    return this.email.getEmailSenderDomain();
  }

  getEmailFrom(): string {
    return this.email.getEmailFrom();
  }

  getMetaConfig() {
    return this.whatsapp.getMetaConfig();
  }

  isPerClinicWhatsappSenderEnabled(): boolean {
    return this.whatsapp.isPerClinicWhatsappSenderEnabled();
  }
}
