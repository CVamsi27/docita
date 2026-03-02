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

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!(this.phoneNumberId && this.accessToken && this.businessAccountId);
  }

  async send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    this.logger.log(
      `Sending WhatsApp message to ${recipientId} with template ${content.templateKey}`,
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
    this.logger.log('Handling WhatsApp webhook:', payload);
  }
}
