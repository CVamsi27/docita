import { Injectable, Logger } from '@nestjs/common';
import type { IClock } from '@/shared/common/ports/clock.port';
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

  constructor(
    private smtpConfig: SMTPConfig,
    private readonly clock: IClock,
  ) {}

  getName(): string {
    return 'Email';
  }

  async isAvailable(): Promise<boolean> {
    await Promise.resolve();
    return !!this.smtpConfig;
  }

  async send(
    _recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    this.logger.log(`Sending email using template ${content.templateKey}`);

    return await Promise.resolve({
      messageId: `em_${Date.now()}`,
      status: 'sent',
      channel: 'Email',
      sentAt: this.clock.now(),
    });
  }

  async handleWebhook(_payload: unknown): Promise<void> {
    await Promise.resolve();
    this.logger.log('Handling email webhook event');
  }
}
