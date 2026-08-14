import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  type IWhatsAppClient,
  type ResolvedWhatsappSender,
  type SendInteractiveRequest,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { CircuitBreakerRegistry } from '@/shared/common/utils/circuit-breaker.registry';

type LegacySendResult = {
  success: boolean;
  messageId: string;
};

/**
 * Redact a phone number for log output. Phone numbers are PII (DPDP), so
 * structured logs should only carry the last 4 digits; the surrounding
 * context (sender, request id) is enough to correlate without leaking the
 * full value. Falls back to the raw input if it isn't a recognizable
 * digit string, since truncating non-digit data produces nonsense.
 */
function truncatePhone(phone: string | undefined): string {
  if (!phone) return '<unset>';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

/** Single Meta Graph API client for legacy clinic sends and v2 use-cases. */
@Injectable()
export class WhatsappClientAdapter implements IWhatsAppClient {
  private readonly logger = new Logger(WhatsappClientAdapter.name);
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private tokenExpired = false;

  constructor(
    private readonly configService: AppConfigService,
    @Optional()
    @Inject(CircuitBreakerRegistry)
    private readonly circuitBreakerRegistry?: CircuitBreakerRegistry,
  ) {
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

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { to, templateName, languageCode, components, text } = request;
    const phoneNumberId = request.sender?.phoneNumberId || this.phoneNumberId;
    const accessToken = request.sender?.accessToken || this.accessToken;

    if (!phoneNumberId || !accessToken) {
      this.logger.warn('WhatsApp not configured, skipping send');
      return { externalId: `skipped-${Date.now()}` };
    }

    if (this.tokenExpired)
      throw new ServiceUnavailableException('WhatsApp access token expired');

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
      const data = await this.callApi(payload, { phoneNumberId, accessToken });
      const externalId = this.extractFirstMessageId(data);
      this.logger.log(
        `WhatsApp message sent to ${truncatePhone(cleanPhone)}: ${externalId}`,
      );
      return { externalId };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `WhatsApp request failed for ${truncatePhone(to)}`,
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException('WhatsApp service unavailable');
    }
  }

  async sendInteractiveMessage(
    request: SendInteractiveRequest,
  ): Promise<SendMessageResponse> {
    const phoneNumberId = request.sender?.phoneNumberId || this.phoneNumberId;
    const accessToken = request.sender?.accessToken || this.accessToken;

    if (!phoneNumberId || !accessToken) {
      return { externalId: `skipped-${Date.now()}` };
    }
    if (this.tokenExpired)
      throw new ServiceUnavailableException('WhatsApp access token expired');
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
    if (request.headerText) {
      interactive.header = { type: 'text', text: request.headerText };
    }
    if (request.footerText) {
      interactive.footer = { text: request.footerText };
    }
    try {
      const data = await this.callApi(
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'interactive',
          interactive,
        },
        { phoneNumberId, accessToken },
      );
      const externalId = this.extractFirstMessageId(data);
      this.logger.log(
        `WhatsApp interactive message sent to ${cleanPhone}: ${externalId}`,
      );
      return { externalId };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        'WhatsApp interactive message failed',
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

  /** Clinic/support text send returning legacy `{ success, messageId }` shape. */
  async sendTextMessage({
    to,
    message,
    sender,
  }: {
    to: string;
    message: string;
    sender?: ResolvedWhatsappSender;
  }): Promise<LegacySendResult> {
    try {
      const result = await this.sendMessage({ to, text: message, sender });
      if (result.externalId.startsWith('skipped-')) {
        return { success: false, messageId: 'skipped-no-config' };
      }
      return { success: true, messageId: result.externalId };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Failed to send WhatsApp message');
    }
  }

  async sendTemplate({
    to,
    templateName,
    languageCode = 'en',
    components,
    sender,
  }: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: SendMessageRequest['components'];
    sender?: ResolvedWhatsappSender;
  }): Promise<LegacySendResult> {
    try {
      const result = await this.sendMessage({
        to,
        templateName,
        languageCode,
        components,
        sender,
      });
      if (result.externalId.startsWith('skipped-')) {
        return { success: false, messageId: 'skipped-no-config' };
      }
      this.logger.log(
        `WhatsApp template '${templateName}' sent to ${this.normalizePhoneNumber(to)}: ${result.externalId}`,
      );
      return { success: true, messageId: result.externalId };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Failed to send WhatsApp template');
    }
  }

  async sendInteractiveButtons({
    to,
    bodyText,
    buttons,
    headerText,
    footerText,
    sender,
  }: {
    to: string;
    bodyText: string;
    buttons: Array<{ id: string; title: string }>;
    headerText?: string;
    footerText?: string;
    sender?: ResolvedWhatsappSender;
  }): Promise<LegacySendResult> {
    try {
      const result = await this.sendInteractiveMessage({
        to,
        bodyText,
        buttons,
        headerText,
        footerText,
        sender,
      });
      if (result.externalId.startsWith('skipped-')) {
        return { success: false, messageId: 'skipped-no-config' };
      }
      return { success: true, messageId: result.externalId };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Failed to send WhatsApp interactive message',
      );
    }
  }

  private async callApi(
    payload: Record<string, unknown>,
    sender?: { phoneNumberId: string; accessToken: string },
  ): Promise<Record<string, unknown>> {
    const breaker = this.circuitBreakerRegistry?.get('whatsapp-meta-api');

    const execute = async (): Promise<Record<string, unknown>> => {
      const phoneNumberId = sender?.phoneNumberId || this.phoneNumberId;
      const accessToken = sender?.accessToken || this.accessToken;
      const response = await fetchWithTimeout(
        `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
          this.logger.error(`WhatsApp send failed: ${errorMsg}`, data);
        }
        throw new ServiceUnavailableException(
          `WhatsApp API error: ${errorMsg}`,
        );
      }

      return data;
    };

    if (breaker) {
      return breaker.call(execute, async () => {
        this.logger.warn(
          '[circuit-breaker] WhatsApp API is OPEN — returning fallback',
        );
        return {};
      });
    }

    // jscpd:ignore-start
    return execute();
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return Object.fromEntries(Object.entries(value));
  }

  private extractErrorMessage(data: Record<string, unknown>): string {
    // jscpd:ignore-end
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

  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/^whatsapp:/i, '');
    cleaned = cleaned.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      return `91${cleaned}`;
    }
    return cleaned;
  }
}
