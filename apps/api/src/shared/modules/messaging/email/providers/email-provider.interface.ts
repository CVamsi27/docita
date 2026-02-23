/**
 * Email provider interface for abstracting email delivery.
 * Enables swapping between providers (Resend, SES, SMTP) without code changes.
 */
export interface IEmailProvider {
  /**
   * Send a single email.
   */
  send(options: EmailOptions): Promise<EmailSendResult>;

  /**
   * Send a templated email.
   */
  sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult>;

  /**
   * Verify the provider is configured correctly.
   */
  verify(): Promise<boolean>;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface TemplatedEmailOptions {
  to: string | string[];
  templateId: string;
  templateData: Record<string, unknown>;
  from?: string;
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
