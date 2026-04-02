import { Injectable, Logger } from '@nestjs/common';
import {
  IMessageChannel,
  MessageContent,
  SendMessageResult,
} from './message-channel.interface';

@Injectable()
export class WhatsAppChannel implements IMessageChannel {
  private readonly logger = new Logger(WhatsAppChannel.name);
  private readonly apiVersion = 'v18.0';

  constructor(
    private phoneNumberId: string,
    private accessToken: string,
    private businessAccountId: string,
  ) {}

  getName(): string {
    return 'WhatsApp';
  }

  private maskRecipient(recipientId: string): string {
    const suffix = recipientId.slice(-2);
    return `***${suffix}`;
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!(this.phoneNumberId && this.accessToken && this.businessAccountId);
  }

  async send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    this.logger.log(
      `Sending WhatsApp message to ${this.maskRecipient(recipientId)} with template ${content.templateKey}`,
    );

    return await Promise.resolve({
      messageId: `wh_${Date.now()}`,
      status: 'pending',
      channel: 'WhatsApp',
      sentAt: new Date(),
    });
  }

  async handleWebhook(payload: unknown): Promise<void> {
    await Promise.resolve();
    const eventType =
      typeof payload === 'object' &&
      payload !== null &&
      'type' in payload &&
      typeof payload.type === 'string'
        ? payload.type
        : 'unknown';
    this.logger.log(`Handling WhatsApp webhook event type: ${eventType}`);
  }
}
