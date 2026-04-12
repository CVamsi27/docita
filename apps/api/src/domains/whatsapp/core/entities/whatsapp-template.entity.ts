import {
  TemplateButton,
  TemplateVariable,
} from '../services/default-templates.service';

export enum WhatsAppTemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED',
}

export enum WhatsAppTemplateCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
}

export type WhatsAppTemplateButtonType =
  | 'NONE'
  | 'QUICK_REPLY'
  | 'CALL_TO_ACTION';

export interface WhatsAppTemplateProps {
  id: string;
  clinicId: string;
  name: string;
  category: WhatsAppTemplateCategory;
  content: string;
  status: WhatsAppTemplateStatus;
  buttons?: TemplateButton[];
  variables?: TemplateVariable[];
  buttonType?: WhatsAppTemplateButtonType;
  metaTemplateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppTemplate {
  private readonly props: WhatsAppTemplateProps;

  constructor(props: WhatsAppTemplateProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get clinicId(): string {
    return this.props.clinicId;
  }
  get status(): WhatsAppTemplateStatus {
    return this.props.status;
  }
  get category(): WhatsAppTemplateCategory {
    return this.props.category;
  }
  get content(): string {
    return this.props.content;
  }
  get variables(): TemplateVariable[] | undefined {
    return this.props.variables;
  }
  get buttons(): TemplateButton[] | undefined {
    return this.props.buttons;
  }
  get buttonType(): WhatsAppTemplateButtonType | undefined {
    return this.props.buttonType;
  }
  get metaTemplateId(): string | undefined {
    return this.props.metaTemplateId;
  }

  static create(
    props: Omit<
      WhatsAppTemplateProps,
      'id' | 'createdAt' | 'updatedAt' | 'status'
    >,
  ): WhatsAppTemplate {
    const now = new Date();
    return new WhatsAppTemplate({
      ...props,
      id: Math.random().toString(36).substring(7),
      status: WhatsAppTemplateStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  approve(): void {
    this.props.status = WhatsAppTemplateStatus.APPROVED;
    this.props.updatedAt = new Date();
  }

  reject(): void {
    this.props.status = WhatsAppTemplateStatus.REJECTED;
    this.props.updatedAt = new Date();
  }

  updateContent(content: string, buttons?: TemplateButton[]): void {
    this.props.content = content;
    this.props.buttons = buttons;
    this.props.updatedAt = new Date();
  }

  toSnapshot(): WhatsAppTemplateProps {
    return { ...this.props };
  }
}
