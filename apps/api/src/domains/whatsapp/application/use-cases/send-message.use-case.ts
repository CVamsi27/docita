import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import {
  WHATSAPP_CLIENT_TOKEN,
  IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { WhatsAppMessage } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import {
  TemplateResolverService,
  ResolvedTemplate,
} from '@/domains/whatsapp/core/services/template-resolver.service';

export interface SendMessageRequest {
  clinicId: string;
  recipientPhone: string;
  templateName?: string;
  text?: string;
  languageCode?: string;
  variables?: Record<string, string>;
  metadata?: Record<string, string | number | boolean>;
}

export type SendMessageResult = {
  messageId: string;
  providerMessageId: string;
};

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
    private readonly configService: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.useProductionMode = this.configService.getMetaConfig().productionMode;
  }

  async execute(request: SendMessageRequest): Promise<SendMessageResult> {
    const {
      clinicId,
      recipientPhone,
      templateName,
      text,
      languageCode = 'en',
      variables = {},
      metadata,
    } = request;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true, intelligenceAddon: true, features: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    assertClinicHasFeatureOrThrow(
      {
        tier: clinic.tier,
        intelligenceAddon: clinic.intelligenceAddon,
        features: clinic.features,
      },
      Feature.WHATSAPP_MESSAGING,
    );

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

    this.eventEmitter.emit('whatsapp.message.sent', {
      clinicId,
      messageId: message.id,
      messageType: templateName ? 'template' : 'session',
    });

    return {
      messageId: message.id,
      providerMessageId: externalId ?? '',
    };
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
