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

  async send(
    _recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    this.logger.log(`Sending SMS using template ${content.templateKey}`);

    return await Promise.resolve({
      messageId: `sms_${Date.now()}`,
      status: 'sent',
      channel: 'SMS',
      sentAt: new Date(),
    });
  }

  async handleWebhook(_payload: unknown): Promise<void> {
    await Promise.resolve();
    this.logger.log('Handling SMS webhook event');
  }
}
