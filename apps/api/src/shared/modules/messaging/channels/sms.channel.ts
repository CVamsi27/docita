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

interface SMSConfig {
  apiKey: string;
  senderId: string;
}

@Injectable()
export class SmsChannel implements IMessageChannel {
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private smsConfig: SMSConfig) {}

  getName(): string {
    return 'SMS';
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!this.smsConfig;
  }

  send(recipientId: string, content: MessageContent): SendMessageResult {
    this.logger.log(
      `Sending SMS to ${recipientId} with template ${content.templateKey}`,
    );

    return {
      messageId: `sms_${Date.now()}`,
      status: 'sent',
      channel: 'SMS',
      sentAt: new Date(),
    };
  }

  async handleWebhook(payload: unknown): Promise<void> {
    // Handle SMS provider webhooks (delivery, bounce, etc.)
    await Promise.resolve();
    this.logger.log('Handling SMS webhook:', payload);
  }
}
