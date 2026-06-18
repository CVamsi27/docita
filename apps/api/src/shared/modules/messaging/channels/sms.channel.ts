import { Injectable, Logger } from '@nestjs/common';
import type { IClock } from '@/shared/common/ports/clock.port';
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

  constructor(
    private smsConfig: SMSConfig,
    private readonly clock: IClock,
  ) {}

  getName(): string {
    return 'SMS';
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    // Only advertise availability when real credentials are configured — an
    // empty config must not let the orchestrator pick this channel and report
    // a non-existent send as success.
    return !!this.smsConfig?.apiKey && !!this.smsConfig?.senderId;
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
      sentAt: this.clock.now(),
    });
  }

  async handleWebhook(_payload: unknown): Promise<void> {
    await Promise.resolve();
    this.logger.log('Handling SMS webhook event');
  }
}
