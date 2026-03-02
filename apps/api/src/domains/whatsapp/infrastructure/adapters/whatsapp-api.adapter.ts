import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  IWhatsAppClient,
  SendMessageRequest,
  SendMessageResponse,
  SendInteractiveRequest,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppApiAdapter implements IWhatsAppClient {
  private readonly logger = new Logger(WhatsAppApiAdapter.name);
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId =
      this.configService.get<string>('META_PHONE_NUMBER_ID') || '';
    this.accessToken =
      this.configService.get<string>('META_ACCESS_TOKEN') || '';

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp API credentials not fully configured');
    }
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  private extractErrorMessage(data: Record<string, unknown>): string {
    const error = this.toRecord(data.error);
    const message = error.message;
    return typeof message === 'string' ? message : 'WhatsApp API error';
  }

  private extractFirstMessageId(data: Record<string, unknown>): string {
    const messages = data.messages;
    if (!Array.isArray(messages)) {
      return '';
    }

    const first = messages[0];
    const firstRecord = this.toRecord(first);
    const id = firstRecord.id;
    return typeof id === 'string' ? id : '';
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { to, templateName, languageCode, components, text } = request;

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp not configured, skipping send');
      return { externalId: `skipped-${Date.now()}` };
    }

    const cleanPhone = this.normalizePhoneNumber(to);
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
    };

    if (templateName) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: languageCode || 'en' },
        components,
      };
    } else if (text) {
      payload.type = 'text';
      payload.text = { body: text };
    } else {
      throw new Error('Either templateName or text must be provided');
    }

    try {
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

      const data = this.toRecord(await response.json());

      if (!response.ok) {
        const errorMsg = this.extractErrorMessage(data);
        this.logger.error(`WhatsApp send failed: ${errorMsg}`, data);
        throw new ServiceUnavailableException(errorMsg);
      }

      return { externalId: this.extractFirstMessageId(data) };
    } catch (error: unknown) {
      this.logger.error(
        `WhatsApp send failed for ${to}`,
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException('WhatsApp service unavailable');
    }
  }

  async sendInteractiveMessage(
    request: SendInteractiveRequest,
  ): Promise<SendMessageResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      return { externalId: `skipped-${Date.now()}` };
    }

    const cleanPhone = this.normalizePhoneNumber(request.to);
    const interactive: Record<string, unknown> = {
      type: 'button',
      body: { text: request.bodyText },
      action: {
        buttons: request.buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20),
          },
        })),
      },
    };

    if (request.headerText)
      interactive.header = { type: 'text', text: request.headerText };
    if (request.footerText) interactive.footer = { text: request.footerText };

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
            type: 'interactive',
            interactive,
          }),
        },
      );

      const data = this.toRecord(await response.json());
      if (!response.ok) {
        throw new ServiceUnavailableException(this.extractErrorMessage(data));
      }

      return { externalId: this.extractFirstMessageId(data) };
    } catch (error: unknown) {
      this.logger.error(
        `Interactive message failed`,
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException('WhatsApp service unavailable');
    }
  }

  checkHealth(): Promise<boolean> {
    return Promise.resolve(!!(this.phoneNumberId && this.accessToken));
  }

  private normalizePhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && !clean.startsWith('91')) {
      return `91${clean}`;
    }
    return clean;
  }
}
