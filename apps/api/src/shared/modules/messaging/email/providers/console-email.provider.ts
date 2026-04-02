import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
} from './email-provider.interface';

@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  private getRecipientCount(to: string | string[]): number {
    return Array.isArray(to) ? to.length : 1;
  }

  send(options: EmailOptions): Promise<EmailSendResult> {
    this.logger.log('[Email] Would be sent:');
    this.logger.log(`  Recipient count: ${this.getRecipientCount(options.to)}`);
    this.logger.log(`  Subject: ${options.subject}`);
    this.logger.log(`  From: ${options.from || 'default'}`);

    if (options.text) {
      this.logger.debug(`  Text length: ${options.text.length}`);
    }

    return Promise.resolve({
      success: true,
      messageId: `console-${Date.now()}`,
    });
  }

  sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    this.logger.log('[Email] Templated email would be sent:');
    this.logger.log(`  Recipient count: ${this.getRecipientCount(options.to)}`);
    this.logger.log(`  Template: ${options.templateId}`);
    this.logger.log(
      `  Template data keys: ${Object.keys(options.templateData).join(', ')}`,
    );

    return Promise.resolve({
      success: true,
      messageId: `console-template-${Date.now()}`,
    });
  }

  verify(): Promise<boolean> {
    this.logger.log('Console email provider is ready (development mode)');
    return Promise.resolve(true);
  }
}
