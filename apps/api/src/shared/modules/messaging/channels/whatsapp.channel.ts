/**
 * WhatsApp Channel Implementation
 * Sends messages via WhatsApp Cloud API
 */

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
    // Check if API credentials are configured
    await Promise.resolve();
    return !!(this.phoneNumberId && this.accessToken && this.businessAccountId);
  }

  async send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    try {
      this.logger.log(
        `Sending WhatsApp message to ${recipientId} with template ${content.templateKey}`,
      );

      // Placeholder response
      return {
        messageId: `wh_${Date.now()}`,
        status: 'pending',
        channel: 'WhatsApp',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    this.logger.log('Handling WhatsApp webhook:', payload);
  }
}
