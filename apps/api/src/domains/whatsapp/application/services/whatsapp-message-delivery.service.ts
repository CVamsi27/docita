import { Inject, Injectable, Optional } from '@nestjs/common';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
  type ResolvedWhatsappSender,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import {
  type ResolvedTemplate,
  TemplateResolverService,
} from '@/domains/whatsapp/core/services/template-resolver.service';
import {
  resolveSharedWhatsappSender,
  WhatsappSenderResolver,
} from '@/domains/whatsapp/application/services/whatsapp-sender-resolver.service';
import { isRecord } from '@workspace/utils';
import { buildMetaTemplateComponents } from '@/shared/whatsapp/whatsapp-template-components.util';

interface DeliverWhatsappMessageInput {
  clinicId: string;
  recipientPhone: string;
  clinicName: string;
  branding: unknown;
  templateName?: string;
  text?: string;
  languageCode: string;
  variables: Record<string, string>;
}

interface DeliveredWhatsappMessage {
  externalId: string;
  finalContent: string;
  sender: ResolvedWhatsappSender;
}

type DeliveryContext = DeliverWhatsappMessageInput & {
  messageVariables: Record<string, string>;
  clinicDisplayName: string;
  sender: ResolvedWhatsappSender;
  resolvedSender?: ResolvedWhatsappSender;
};

@Injectable()
export class WhatsappMessageDeliveryService {
  private readonly useProductionMode: boolean;

  constructor(
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly client: IWhatsAppClient,
    private readonly templateResolver: TemplateResolverService,
    private readonly configService: AppConfigService,
    @Optional()
    private readonly senderResolver?: WhatsappSenderResolver,
  ) {
    this.useProductionMode = this.configService.getMetaConfig().productionMode;
  }

  async deliver(
    input: DeliverWhatsappMessageInput,
  ): Promise<DeliveredWhatsappMessage> {
    const resolvedSender = await this.senderResolver?.resolve(input.clinicId);
    const sender = resolvedSender ?? this.resolveSharedSender();
    const clinicDisplayName = this.resolveClinicDisplayName(
      input.clinicName,
      input.branding,
    );
    const context: DeliveryContext = {
      ...input,
      clinicDisplayName,
      sender,
      messageVariables: {
        clinicName: clinicDisplayName,
        ...input.variables,
      },
      ...(resolvedSender ? { resolvedSender } : {}),
    };
    const delivered = await this.deliverWithContext(context);
    return { ...delivered, sender };
  }

  private async deliverWithContext(
    context: DeliveryContext,
  ): Promise<Omit<DeliveredWhatsappMessage, 'sender'>> {
    const resolved = await this.resolveTemplate(context);
    if (resolved && context.templateName) {
      return this.deliverResolvedTemplate(context, resolved);
    }
    if (context.text) return this.deliverTextMessage(context, context.text);
    throw new InvariantViolationError(
      'Either templateName or text must be provided',
    );
  }

  private async resolveTemplate(
    context: DeliveryContext,
  ): Promise<ResolvedTemplate | null> {
    if (!context.templateName) return null;
    return this.templateResolver.resolveTemplate(
      context.templateName,
      context.messageVariables,
      context.clinicId,
    );
  }

  private async deliverResolvedTemplate(
    context: DeliveryContext,
    resolved: ResolvedTemplate,
  ): Promise<Omit<DeliveredWhatsappMessage, 'sender'>> {
    const useApprovedMetaTemplate = this.shouldUseApprovedMetaTemplate(
      context,
      resolved,
    );
    const finalContent = this.withSharedSenderPrefix(
      useApprovedMetaTemplate
        ? resolved.content
        : this.resolveTemplateBody(resolved),
      context.sender.mode,
      context.clinicDisplayName,
    );
    if (useApprovedMetaTemplate) {
      const result = await this.client.sendMessage({
        to: context.recipientPhone,
        templateName: context.templateName,
        languageCode: context.languageCode,
        components: buildMetaTemplateComponents(
          resolved.variables,
          context.messageVariables,
          resolved.buttonUrlVariable,
        ),
        ...this.senderOption(context),
      });
      return { externalId: result.externalId, finalContent };
    }
    if (this.hasQuickReplyButtons(resolved)) {
      const result = await this.client.sendInteractiveMessage({
        to: context.recipientPhone,
        bodyText: finalContent,
        buttons: resolved.buttons.map((button) => ({
          id: button.id,
          title: button.text,
        })),
        ...this.senderOption(context),
      });
      return { externalId: result.externalId, finalContent };
    }
    return this.deliverTextMessage(context, finalContent, false);
  }

  private async deliverTextMessage(
    context: DeliveryContext,
    text: string,
    applyPrefix = true,
  ): Promise<Omit<DeliveredWhatsappMessage, 'sender'>> {
    const finalContent = applyPrefix
      ? this.withSharedSenderPrefix(
          text,
          context.sender.mode,
          context.clinicDisplayName,
        )
      : text;
    const result = await this.client.sendMessage({
      to: context.recipientPhone,
      text: finalContent,
      ...this.senderOption(context),
    });
    return { externalId: result.externalId, finalContent };
  }

  private resolveTemplateBody(resolved: ResolvedTemplate): string {
    return resolved.buttonType === 'CALL_TO_ACTION'
      ? resolved.textFallback
      : resolved.content;
  }

  private shouldUseApprovedMetaTemplate(
    context: DeliveryContext,
    resolved: ResolvedTemplate,
  ): boolean {
    return (
      this.useProductionMode &&
      !!resolved.metaTemplateId &&
      !!context.templateName
    );
  }

  private hasQuickReplyButtons(
    resolved: ResolvedTemplate,
  ): resolved is ResolvedTemplate & {
    buttons: Array<{ id: string; text: string }>;
  } {
    return (
      resolved.buttonType === 'QUICK_REPLY' &&
      Array.isArray(resolved.buttons) &&
      resolved.buttons.length > 0
    );
  }

  private senderOption(
    context: DeliveryContext,
  ): { sender: ResolvedWhatsappSender } | Record<string, never> {
    return context.resolvedSender ? { sender: context.sender } : {};
  }

  private withSharedSenderPrefix(
    content: string,
    senderMode: string,
    clinicName: string,
  ): string {
    if (senderMode !== 'SHARED') return content;
    if (!clinicName) return content;
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
    if (isRecord(branding)) {
      const displayName = branding.displayName;
      if (typeof displayName === 'string' && displayName.trim()) {
        return displayName.trim();
      }
    }
    return clinicName;
  }

  private resolveSharedSender(): ResolvedWhatsappSender {
    return resolveSharedWhatsappSender(this.configService);
  }
}
