export enum WhatsAppMessageStatus {
  DISPATCHED = 'DISPATCHED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export interface WhatsAppMessageProps {
  id: string;
  clinicId: string;
  conversationId: string;
  recipientPhone: string;
  templateName?: string;
  content?: string;
  status: WhatsAppMessageStatus;
  externalMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean>;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
}

export class WhatsAppMessage {
  private readonly props: WhatsAppMessageProps;

  constructor(props: WhatsAppMessageProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get clinicId(): string {
    return this.props.clinicId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get status(): WhatsAppMessageStatus {
    return this.props.status;
  }

  static create(
    props: Omit<WhatsAppMessageProps, 'id' | 'sentAt' | 'status'>,
    now: Date,
  ): WhatsAppMessage {
    return new WhatsAppMessage({
      ...props,
      id: crypto.randomUUID(),
      status: WhatsAppMessageStatus.DISPATCHED,
      sentAt: now,
    });
  }

  updateStatus(
    status: WhatsAppMessageStatus,
    now: Date,
    externalId?: string,
  ): void {
    this.props.status = status;
    if (externalId) {
      this.props.externalMessageId = externalId;
    }
    switch (status) {
      case WhatsAppMessageStatus.DELIVERED:
        this.props.deliveredAt = now;
        break;
      case WhatsAppMessageStatus.READ:
        this.props.readAt = now;
        break;
      case WhatsAppMessageStatus.FAILED:
        this.props.failedAt = now;
        break;
    }
  }

  setError(code: string, message: string, now: Date): void {
    this.props.status = WhatsAppMessageStatus.FAILED;
    this.props.errorCode = code;
    this.props.errorMessage = message;
    this.props.failedAt = now;
  }

  toSnapshot(): WhatsAppMessageProps {
    return { ...this.props };
  }
}
