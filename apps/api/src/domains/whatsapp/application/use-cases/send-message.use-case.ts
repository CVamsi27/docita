import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import { assertClinicHasFeatureOrThrow } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  type IWhatsAppRepository,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { WhatsAppMessage } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { WhatsappMessageDeliveryService } from '@/domains/whatsapp/application/services/whatsapp-message-delivery.service';

interface SendMessageRequest {
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

  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
    private readonly delivery: WhatsappMessageDeliveryService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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

    const clinic = await this.repository.findClinicMessageContext(clinicId);
    if (!clinic) throw new NotFoundException('Clinic not found');

    assertClinicHasFeatureOrThrow(
      {
        tier: clinic.tier,
        intelligenceAddon: clinic.intelligenceAddon,
        features: clinic.features,
      },
      Feature.WHATSAPP_MESSAGING,
    );

    const delivered = await this.delivery.deliver({
      clinicId,
      recipientPhone,
      clinicName: clinic.name,
      branding: clinic.branding,
      templateName,
      text,
      languageCode,
      variables,
    });

    const conversationId = await this.repository.ensureConversation(
      clinicId,
      recipientPhone,
    );
    const message = WhatsAppMessage.create(
      {
        clinicId,
        recipientPhone,
        conversationId,
        templateName: templateName || undefined,
        content: delivered.finalContent,
        externalMessageId: delivered.externalId,
        metadata,
      },
      this.clock.now(),
    );

    await this.repository.saveMessage(message);

    this.eventEmitter.emit(ApplicationEvents.WHATSAPP_MESSAGE_SENT, {
      // allow-direct-emit: post-commit telemetry/analytics fan-out; the message persistence above is a single atomic write. Outbox migration deferred (ADR 0010 §Follow-up).
      clinicId,
      messageId: message.id,
      messageType: templateName ? 'template' : 'session',
      senderMode: delivered.sender.mode,
    });

    return {
      messageId: message.id,
      providerMessageId: delivered.externalId ?? '',
      senderMode: delivered.sender.mode,
      senderPhoneNumberId: delivered.sender.senderPhoneNumberId,
    };
  }
}
