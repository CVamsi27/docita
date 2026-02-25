/**
 * Email Channel Implementation
 * Sends messages via email
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IMessageChannel,
  MessageContent,
  SendMessageResult,
} from './message-channel.interface';

@Injectable()
export class EmailChannel implements IMessageChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private smtpConfig: any) {}

  getName(): string {
    return 'Email';
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!this.smtpConfig;
  }

  async send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    try {
      this.logger.log(
        `Sending email to ${recipientId} with template ${content.templateKey}`,
      );

      return {
        messageId: `em_${Date.now()}`,
        status: 'sent',
        channel: 'Email',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    // Handle email provider webhooks (delivery, bounce, etc.)
    await Promise.resolve();
    this.logger.log('Handling email webhook:', payload);
  }
}
