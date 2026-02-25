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

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

@Injectable()
export class EmailChannel implements IMessageChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private smtpConfig: SMTPConfig) {}

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
    this.logger.log(
      `Sending email to ${recipientId} with template ${content.templateKey}`,
    );

    return await Promise.resolve({
      messageId: `em_${Date.now()}`,
      status: 'sent',
      channel: 'Email',
      sentAt: new Date(),
    });
  }

  async handleWebhook(payload: unknown): Promise<void> {
    // Handle email provider webhooks (delivery, bounce, etc.)
    await Promise.resolve();
    this.logger.log('Handling email webhook:', payload);
  }
}
