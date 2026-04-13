import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
} from './email-provider.interface';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly apiUrl: string;

  constructor(private configService: AppConfigService) {
    this.apiKey = this.configService.getResendApiKey();
    this.defaultFrom = this.configService.getEmailFrom();
    this.apiUrl = this.configService.getResendApiUrl();

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured - emails will fail');
    }
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.apiKey) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || this.defaultFrom,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content:
              typeof att.content === 'string'
                ? att.content
                : att.content.toString('base64'),
            content_type: att.contentType,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        this.logger.error('Resend API error:', errorData);
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      this.logger.log(`Email sent successfully: ${data.id}`);

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send email via Resend:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    this.logger.log(
      `Sending templated email to ${options.to} using template ${options.templateId}`,
    );

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
    if (!this.apiKey) {
      this.logger.error('RESEND_API_KEY not configured');
      return false;
    }

    try {
      const verifyUrl = this.apiUrl.replace(/\/emails$/, '/api-keys');
      const response = await fetch(verifyUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        this.logger.log('Resend email provider verified successfully');
        return true;
      }

      this.logger.error('Resend API verification failed:', response.status);
      return false;
    } catch (error) {
      this.logger.error(
        'Resend verification error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }
}
