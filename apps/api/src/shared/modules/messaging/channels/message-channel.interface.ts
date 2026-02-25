/**
 * Message Channel Interface
 * Base interface for all message channels (WhatsApp, Email, SMS)
 */

export interface MessageContent {
  templateKey: string;
  variables?: Record<string, unknown>;
  attachments?: attachment[];
}

export interface attachment {
  type: 'document' | 'image' | 'video' | 'audio';
  url: string;
  filename?: string;
}

export interface SendMessageResult {
  messageId: string;
  status: 'sent' | 'pending' | 'failed';
  channel: string;
  sentAt: Date;
  error?: string;
}

export interface IMessageChannel {
  /**
   * Get channel name
   */
  getName(): string;

  /**
   * Check if channel is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Send message through this channel
   */
  send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult>;

  /**
   * Handle webhook/callback from provider
   */
  handleWebhook(payload: unknown): Promise<void>;
}
