import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
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
import { WhatsappSenderResolver } from '@/domains/whatsapp/application/services/whatsapp-sender-resolver.service';

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
  senderMode?: 'SHARED' | 'BYO' | 'MANAGED';
  senderPhoneNumberId?: string | null;
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
    @Optional()
    private readonly senderResolver?: WhatsappSenderResolver,
  ) {
    this.useProductionMode = this.configService.getMetaConfig().productionMode;
  }

  async execute(request: SendMessageRequest): Promise<SendMessageResult> {
    // AuditLogged: whatsapp message send
    this.logger.log({
      action: 'whatsapp.send',
      clinicId: request.clinicId,
      templateName: request.templateName,
    });

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
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
        name: true,
        branding: true,
      },
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

    const resolvedSender = await this.senderResolver?.resolve(clinicId);
    const sender = resolvedSender ?? this.resolveSharedSender();
    const clinicDisplayName = this.resolveClinicDisplayName(
      clinic.name,
      clinic.branding,
    );
    const messageVariables = {
      clinicName: clinicDisplayName,
      ...variables,
    };

    let resolved: ResolvedTemplate | null = null;
    if (templateName) {
      resolved = await this.templateResolver.resolveTemplate(
        templateName,
        messageVariables,
        clinicId,
      );
    }

    let externalId: string;
    let finalContent: string;

    if (resolved) {
      finalContent = this.withSharedSenderPrefix(
        resolved.content,
        sender.mode,
        clinicDisplayName,
      );
      if (this.useProductionMode && resolved.metaTemplateId) {
        const components = this.parseVariablesIntoComponents(messageVariables);
        const result = await this.client.sendMessage({
          to: recipientPhone,
          templateName: templateName!,
          languageCode,
          components,
          ...(resolvedSender ? { sender } : {}),
        });
        externalId = result.externalId;
      } else if (resolved.buttons && resolved.buttons.length > 0) {
        const result = await this.client.sendInteractiveMessage({
          to: recipientPhone,
          bodyText: finalContent,
          buttons: resolved.buttons.map((b) => ({ id: b.id, title: b.text })),
          ...(resolvedSender ? { sender } : {}),
        });
        externalId = result.externalId;
      } else {
        const result = await this.client.sendMessage({
          to: recipientPhone,
          text: finalContent,
          ...(resolvedSender ? { sender } : {}),
        });
        externalId = result.externalId;
      }
    } else if (text) {
      finalContent = this.withSharedSenderPrefix(
        text,
        sender.mode,
        clinicDisplayName,
      );
      const result = await this.client.sendMessage({
        to: recipientPhone,
        text: finalContent,
        ...(resolvedSender ? { sender } : {}),
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
      senderMode: sender.mode,
    });

    return {
      messageId: message.id,
      providerMessageId: externalId ?? '',
      senderMode: sender.mode,
      senderPhoneNumberId: sender.senderPhoneNumberId,
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

  private withSharedSenderPrefix(
    content: string,
    senderMode: string,
    clinicName: string,
  ): string {
    if (senderMode !== 'SHARED') {
      return content;
    }
    if (!clinicName) {
      return content;
    }
    const prefix = `From ${clinicName}`;
    if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
      return content;
    }
    return `${prefix}\n${content}`;
  }

  private resolveClinicDisplayName(
    clinicName: string,
    branding: unknown,
  ): string {
    if (branding && typeof branding === 'object' && !Array.isArray(branding)) {
      const displayName = (branding as Record<string, unknown>).displayName;
      if (typeof displayName === 'string' && displayName.trim()) {
        return displayName.trim();
      }
    }
    return clinicName;
  }

  private resolveSharedSender() {
    const meta = this.configService.getMetaConfig();
    return {
      phoneNumberId: meta.phoneNumberId,
      accessToken: meta.accessToken,
      mode: 'SHARED' as const,
      senderPhoneNumberId: null,
      displayName: null,
      fallbackActive: false,
    };
  }
}
