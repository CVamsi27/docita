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
    _recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult> {
    this.logger.log(`Sending email using template ${content.templateKey}`);

    return await Promise.resolve({
      messageId: `em_${Date.now()}`,
      status: 'sent',
      channel: 'Email',
      sentAt: new Date(),
    });
  }

  async handleWebhook(_payload: unknown): Promise<void> {
    await Promise.resolve();
    this.logger.log('Handling email webhook event');
  }
}
