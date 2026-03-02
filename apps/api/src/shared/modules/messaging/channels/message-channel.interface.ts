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
  getName(): string;

  isAvailable(): Promise<boolean>;

  send(
    recipientId: string,
    content: MessageContent,
  ): Promise<SendMessageResult>;

  handleWebhook(payload: unknown): Promise<void>;
}
