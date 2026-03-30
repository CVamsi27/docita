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
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class WhatsAppApiAdapter implements IWhatsAppClient {
  private readonly logger = new Logger(WhatsAppApiAdapter.name);
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private tokenExpired = false;

  constructor(private readonly configService: AppConfigService) {
    const metaConfig = this.configService.getMetaConfig();
    this.phoneNumberId = metaConfig.phoneNumberId;
    this.accessToken = metaConfig.accessToken;

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

  private isTokenExpiredError(data: Record<string, unknown>): boolean {
    const error = this.toRecord(data.error);
    const code = error.code;
    const subcode = error.error_subcode;
    const message =
      typeof error.message === 'string' ? error.message.toLowerCase() : '';
    return (
      code === 190 ||
      subcode === 463 ||
      subcode === 467 ||
      message.includes('session has expired') ||
      message.includes('access token') ||
      message.includes('token has expired')
    );
  }

  private async callApi(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
      if (this.isTokenExpiredError(data)) {
        if (!this.tokenExpired) {
          this.tokenExpired = true;
          this.logger.error(
            `WhatsApp access token expired — all sends disabled until token is refreshed. Error: ${errorMsg}`,
          );
        }
      } else {
        this.logger.error(`WhatsApp send failed: ${errorMsg}`);
      }
      throw new ServiceUnavailableException(errorMsg);
    }

    return data;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { to, templateName, languageCode, components, text } = request;

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn('WhatsApp not configured, skipping send');
      return { externalId: `skipped-${Date.now()}` };
    }

    if (this.tokenExpired) {
      throw new ServiceUnavailableException('WhatsApp access token expired');
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
      const data = await this.callApi(payload);
      return { externalId: this.extractFirstMessageId(data) };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `WhatsApp request failed for ${to}`,
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

    if (this.tokenExpired) {
      throw new ServiceUnavailableException('WhatsApp access token expired');
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
      const data = await this.callApi({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'interactive',
        interactive,
      });
      return { externalId: this.extractFirstMessageId(data) };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `WhatsApp interactive message failed`,
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException('WhatsApp service unavailable');
    }
  }

  checkHealth(): Promise<boolean> {
    return Promise.resolve(
      !!(this.phoneNumberId && this.accessToken) && !this.tokenExpired,
    );
  }

  private normalizePhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && !clean.startsWith('91')) {
      return `91${clean}`;
    }
    return clean;
  }
}
