import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-configuration.service';

@Injectable()
export class WhatsappClientService {
  private readonly logger = new Logger(WhatsappClientService.name);
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;

  constructor(private configService: AppConfigService) {
    const config = this.configService.getMetaConfig();
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.appSecret = config.appSecret;
    this.verifyToken = config.verifyToken;

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'WhatsApp credentials not configured. Messaging will fail.',
      );
    }
  }

  get AppSecret() {
    return this.appSecret;
  }

  get VerifyToken() {
    return this.verifyToken;
  }

  async sendMessage({ to, message }: { to: string; message: string }) {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp not configured, skipping send');
      return { success: false, messageId: 'skipped-no-config' };
    }

    const cleanPhone = this.normalizePhoneNumber(to);

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: message },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send message';
        this.logger.error(`WhatsApp API error: ${errorMsg}`, data);
        throw new ServiceUnavailableException(
          `WhatsApp API error: ${errorMsg}`,
        );
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${cleanPhone}: ${messageId}`);

      return { success: true, messageId: messageId as string };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to send WhatsApp message to ${to}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new ServiceUnavailableException('Failed to send WhatsApp message');
    }
  }

  /**
   * Send a template message via WhatsApp Cloud API
   */
  async sendTemplate({
    to,
    templateName,
    languageCode = 'en',
    components,
  }: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters?: Array<{
        type:
          | 'text'
          | 'currency'
          | 'date_time'
          | 'image'
          | 'document'
          | 'video';
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
        date_time?: { fallback_value: string };
      }>;
      sub_type?: 'quick_reply' | 'url';
      index?: number;
    }>;
  }) {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp not configured, skipping template send');
      return { success: false, messageId: 'skipped-no-config' };
    }

    const cleanPhone = this.normalizePhoneNumber(to);

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      };

      if (components && components.length > 0) {
        (payload.template as Record<string, unknown>).components = components;
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send template';
        this.logger.error(`WhatsApp template API error: ${errorMsg}`, data);
        throw new ServiceUnavailableException(
          `WhatsApp template API error: ${errorMsg}`,
        );
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp template '${templateName}' sent to ${cleanPhone}: ${messageId}`,
      );

      return { success: true, messageId };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to send WhatsApp template to ${to}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new ServiceUnavailableException('Failed to send WhatsApp template');
    }
  }

  async sendInteractiveButtons({
    to,
    bodyText,
    buttons,
    headerText,
    footerText,
  }: {
    to: string;
    bodyText: string;
    buttons: Array<{ id: string; title: string }>;
    headerText?: string;
    footerText?: string;
  }) {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp not configured, skipping interactive message');
      return { success: false, messageId: 'skipped-no-config' };
    }

    const cleanPhone = this.normalizePhoneNumber(to);
    const limitedButtons = buttons.slice(0, 3);

    try {
      const interactive: Record<string, unknown> = {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: limitedButtons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20),
            },
          })),
        },
      };

      if (headerText) {
        interactive.header = { type: 'text', text: headerText };
      }
      if (footerText) {
        interactive.footer = { text: footerText };
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'interactive',
            interactive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.error?.message || 'Failed to send interactive message';
        this.logger.error(`WhatsApp interactive API error: ${errorMsg}`, data);
        throw new ServiceUnavailableException(
          `WhatsApp interactive API error: ${errorMsg}`,
        );
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp interactive message sent to ${cleanPhone}: ${messageId}`,
      );

      return { success: true, messageId };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to send WhatsApp interactive message to ${to}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new ServiceUnavailableException(
        'Failed to send WhatsApp interactive message',
      );
    }
  }

  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/^whatsapp:/, '');
    cleaned = cleaned.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/^\+/, '');
    return cleaned;
  }
}
