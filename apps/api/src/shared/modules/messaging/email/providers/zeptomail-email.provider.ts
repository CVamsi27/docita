import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  EmailOptions,
  EmailSendResult,
  IEmailProvider,
  TemplatedEmailOptions,
} from './email-provider.interface';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import { escapeHtml, isRecord } from '@workspace/utils';
import { formatZeptoMailErrorBody } from './zeptomail-error';
import { CircuitBreakerRegistry } from '@/shared/common/utils/circuit-breaker.registry';

type ZeptoMailAddress = {
  address: string;
  name?: string;
};

type ZeptoMailRequest = {
  from: ZeptoMailAddress;
  to: Array<{ email_address: ZeptoMailAddress }>;
  subject: string;
  htmlbody?: string;
  textbody?: string;
  reply_to?: Array<{ address: string; name?: string }>;
  attachments?: Array<{
    name: string;
    content: string;
    mime_type?: string;
  }>;
};

@Injectable()
export class ZeptoMailEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ZeptoMailEmailProvider.name);
  private readonly sendMailToken: string;
  private readonly defaultFrom: string;
  private readonly apiUrl: string;

  constructor(
    private configService: AppConfigService,
    @Optional()
    private readonly circuitBreakerRegistry?: CircuitBreakerRegistry,
  ) {
    this.sendMailToken = this.configService.getZeptoMailSendMailToken();
    this.defaultFrom = this.configService.getEmailFrom();
    this.apiUrl = this.configService.getZeptoMailApiUrl();

    if (!this.sendMailToken) {
      this.logger.warn(
        'ZEPTOMAIL_SENDMAIL_TOKEN not configured - emails will fail',
      );
    }
  }

  private parseFrom(value: string): ZeptoMailAddress {
    const trimmed = value.trim();
    const match = trimmed.match(/^(.*)<([^>]+)>$/);
    if (!match) return { address: trimmed };
    const name = match[1]?.trim().replace(/^"|"$/g, '');
    const address = match[2]?.trim();
    if (!address) return { address: trimmed };
    return name ? { name, address } : { address };
  }

  private normalizeRecipients(to: EmailOptions['to']): ZeptoMailRequest['to'] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients
      .map((address) => address.trim())
      .filter((address) => address.length > 0)
      .map((address) => ({ email_address: { address } }));
  }

  private getAuthorizationHeader(): string {
    const trimmedToken = this.sendMailToken.trim();
    if (/^Zoho-enczapikey\s+/i.test(trimmedToken)) {
      return trimmedToken;
    }
    return `Zoho-enczapikey ${trimmedToken}`;
  }

  private buildPayload(options: EmailOptions): ZeptoMailRequest | null {
    const htmlbody = options.html?.trim();
    const textbody = options.text?.trim();
    if (!htmlbody && !textbody) {
      return null;
    }

    const to = this.normalizeRecipients(options.to);
    if (to.length === 0) {
      return null;
    }

    const attachments = options.attachments?.map((att) => ({
      name: att.filename,
      content:
        typeof att.content === 'string'
          ? att.content
          : att.content.toString('base64'),
      mime_type: att.contentType,
    }));

    return {
      from: this.parseFrom(options.from || this.defaultFrom),
      to,
      subject: options.subject.trim(),
      htmlbody: htmlbody || undefined,
      textbody: textbody || undefined,
      reply_to: options.replyTo
        ? [{ address: options.replyTo.trim() }]
        : undefined,
      attachments:
        attachments && attachments.length > 0 ? attachments : undefined,
    };
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.sendMailToken) {
      return {
        success: false,
        error: 'ZEPTOMAIL_SENDMAIL_TOKEN not configured',
      };
    }

    const payload = this.buildPayload(options);
    if (!payload) {
      return {
        success: false,
        error:
          'Email must include at least one recipient and html or text body',
      };
    }

    try {
      const execute = async () => {
        const response = await fetchWithTimeout(this.apiUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: this.getAuthorizationHeader(),
          },
          body: JSON.stringify(payload),
        });
        return response;
      };

      const breaker = this.circuitBreakerRegistry?.get('zeptomail-api');
      const response = breaker
        ? await breaker.call(execute, async () => {
            this.logger.warn(
              '[circuit-breaker] ZeptoMail API is OPEN — returning fallback',
            );
            return new Response(null, { status: 503 });
          })
        : await execute();

      const responseText = await response.text().catch(() => '');

      if (!response.ok) {
        const error = formatZeptoMailErrorBody(responseText);
        this.logger.error('ZeptoMail API error', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error || `HTTP ${response.status}`,
        };
      }

      let raw: unknown;
      try {
        raw = responseText ? JSON.parse(responseText) : undefined;
      } catch {
        this.logger.error('ZeptoMail returned non-JSON success body', {
          body: responseText.slice(0, 500),
        });
        return {
          success: false,
          error: 'ZeptoMail returned an invalid success response',
        };
      }

      if (isRecord(raw) && isRecord(raw.error)) {
        const error = formatZeptoMailErrorBody(responseText);
        this.logger.error('ZeptoMail API returned error payload', { error });
        return { success: false, error };
      }

      const messageId =
        isRecord(raw) &&
        Array.isArray(raw.data) &&
        isRecord(raw.data[0]) &&
        typeof raw.data[0].message_id === 'string'
          ? raw.data[0].message_id
          : undefined;

      const requestId =
        isRecord(raw) && typeof raw.request_id === 'string'
          ? raw.request_id
          : undefined;

      this.logger.log('ZeptoMail email accepted', {
        messageId,
        requestId,
        recipientCount: payload.to.length,
      });

      return { success: true, messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send email via ZeptoMail', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Docita Notification</h2>
        <div style="margin-top: 20px;">
          ${Object.entries(options.templateData)
            .map(
              ([key, value]) =>
                `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</p>`,
            )
            .join('')}
        </div>
        <p style="margin-top: 30px; font-size: 0.8em; color: #666;">
          This is an automated message from Docita.
        </p>
      </div>
    `;

    return this.send({
      to: options.to,
      subject: `Notification: ${options.templateId}`,
      html,
      from: options.from,
      replyTo: options.replyTo,
    });
  }

  async verify(): Promise<boolean> {
    return Boolean(this.sendMailToken.trim());
  }
}
