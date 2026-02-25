import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '../ports/whatsapp.repository.port';
import {
  WHATSAPP_CLIENT_TOKEN,
  IWhatsAppClient,
} from '../ports/whatsapp-client.port';
import { WhatsAppMessage } from '../../core/entities/whatsapp-message.entity';
import {
  TemplateResolverService,
  ResolvedTemplate,
} from '../../core/services/template-resolver.service';

export interface SendMessageRequest {
  clinicId: string;
  recipientPhone: string;
  templateName?: string;
  text?: string;
  languageCode?: string;
  variables?: Record<string, string>;
  metadata?: Record<string, string | number | boolean>;
}

@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);
  private readonly useProductionMode: boolean;

  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly client: IWhatsAppClient,
    private readonly templateResolver: TemplateResolverService,
    private readonly configService: ConfigService,
  ) {
    this.useProductionMode =
      this.configService.get<string>('WHATSAPP_PRODUCTION_MODE') === 'true';
  }

  async execute(request: SendMessageRequest): Promise<{ messageId: string }> {
    const {
      clinicId,
      recipientPhone,
      templateName,
      text,
      languageCode = 'en',
      variables = {},
      metadata,
    } = request;

    let resolved: ResolvedTemplate | null = null;
    if (templateName) {
      resolved = await this.templateResolver.resolveTemplate(
        templateName,
        variables,
        clinicId,
      );
    }

    let externalId: string;
    let finalContent: string;

    if (resolved) {
      finalContent = resolved.content;
      if (this.useProductionMode && resolved.metaTemplateId) {
        const components = this.parseVariablesIntoComponents(variables);
        const result = await this.client.sendMessage({
          to: recipientPhone,
          templateName: templateName!,
          languageCode,
          components,
        });
        externalId = result.externalId;
      } else if (resolved.buttons && resolved.buttons.length > 0) {
        const result = await this.client.sendInteractiveMessage({
          to: recipientPhone,
          bodyText: resolved.content,
          buttons: resolved.buttons.map((b) => ({ id: b.id, title: b.text })),
        });
        externalId = result.externalId;
      } else {
        const result = await this.client.sendMessage({
          to: recipientPhone,
          text: resolved.content,
        });
        externalId = result.externalId;
      }
    } else if (text) {
      finalContent = text;
      const result = await this.client.sendMessage({
        to: recipientPhone,
        text,
      });
      externalId = result.externalId;
    } else {
      throw new Error('Either templateName or text must be provided');
    }

    const message = WhatsAppMessage.create({
      clinicId,
      recipientPhone,
      conversationId: 'default',
      templateName: templateName || undefined,
      content: finalContent,
      externalMessageId: externalId,
      metadata,
    });

    await this.repository.saveMessage(message);

    return { messageId: message.id };
  }

  private parseVariablesIntoComponents(
    variables: Record<string, string>,
  ): Array<Record<string, unknown>> {
    const parameters = Object.entries(variables).map(([_, value]) => ({
      type: 'text',
      text: value,
    }));

    return parameters.length > 0 ? [{ type: 'body', parameters }] : [];
  }
}
