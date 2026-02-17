import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
} from './email-provider.interface';

/**
 * Console-based email provider for development/testing.
 * Logs emails instead of sending them.
 */
@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  send(options: EmailOptions): Promise<EmailSendResult> {
    this.logger.log('[Email] Would be sent:');
    this.logger.log(
      `  To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
    );
    this.logger.log(`  Subject: ${options.subject}`);
    this.logger.log(`  From: ${options.from || 'default'}`);

    if (options.text) {
      this.logger.debug(`  Text: ${options.text.substring(0, 100)}...`);
    }

    return Promise.resolve({
      success: true,
      messageId: `console-${Date.now()}`,
    });
  }

  sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    this.logger.log('[Email] Templated email would be sent:');
    this.logger.log(
      `  To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
    );
    this.logger.log(`  Template: ${options.templateId}`);
    this.logger.log(`  Data: ${JSON.stringify(options.templateData)}`);

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
