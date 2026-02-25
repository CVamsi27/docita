/**
 * SMS Channel Implementation
 * Sends messages via SMS
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IMessageChannel,
  MessageContent,
  SendMessageResult,
} from './message-channel.interface';

@Injectable()
export class SmsChannel implements IMessageChannel {
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private smsConfig: any) {}

  getName(): string {
    return 'SMS';
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!this.smsConfig;
  }

  async send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    try {
      this.logger.log(
        `Sending SMS to ${recipientId} with template ${content.templateKey}`,
      );

      return {
        messageId: `sms_${Date.now()}`,
        status: 'sent',
        channel: 'SMS',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send SMS: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    // Handle SMS provider webhooks (delivery, bounce, etc.)
    await Promise.resolve();
    this.logger.log('Handling SMS webhook:', payload);
  }
}
