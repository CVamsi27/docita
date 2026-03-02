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
  private readonly apiUrl = 'https://api.resend.com/emails';

  constructor(private configService: AppConfigService) {
    this.apiKey = this.configService.getResendApiKey();
    this.defaultFrom = this.configService.getEmailFrom();

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
        const errorData = await response.json();
        this.logger.error('Resend API error:', errorData);
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
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

  sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    this.logger.warn(
      'Resend template sending not implemented - use pre-rendered HTML',
    );
    return Promise.resolve({
      success: false,
      error: 'Template sending not implemented for Resend',
    });
  }

  async verify(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.error('RESEND_API_KEY not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/domains', {
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
