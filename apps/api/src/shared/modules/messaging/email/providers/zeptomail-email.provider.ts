import { Injectable, Logger } from '@nestjs/common';
import {
  EmailOptions,
  EmailSendResult,
  IEmailProvider,
  TemplatedEmailOptions,
} from './email-provider.interface';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

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
  reply_to?: ZeptoMailAddress;
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

  constructor(private configService: AppConfigService) {
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
    return name ? { name, address } : { address };
  }

  private normalizeRecipients(to: EmailOptions['to']): ZeptoMailRequest['to'] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map((address) => ({ email_address: { address } }));
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.sendMailToken) {
      return {
        success: false,
        error: 'ZEPTOMAIL_SENDMAIL_TOKEN not configured',
      };
    }

    const from = this.parseFrom(options.from || this.defaultFrom);
    const payload: ZeptoMailRequest = {
      from,
      to: this.normalizeRecipients(options.to),
      subject: options.subject,
      htmlbody: options.html,
      textbody: options.text,
      reply_to: options.replyTo ? { address: options.replyTo } : undefined,
      attachments: options.attachments?.map((att) => ({
        name: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
        mime_type: att.contentType,
      })),
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Zoho-enczapikey ${this.sendMailToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.error('ZeptoMail API error', {
          status: response.status,
          body: text,
        });
        return {
          success: false,
          error: text || `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        data?: Array<{ message_id?: string }>;
      };
      const messageId = data?.data?.[0]?.message_id;
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
            .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
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
    return Boolean(this.sendMailToken);
  }
}
