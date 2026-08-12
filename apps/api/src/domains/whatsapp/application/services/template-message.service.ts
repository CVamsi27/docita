import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { WhatsappLogStatus } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

@Injectable()
export class TemplateMessageService {
  private readonly logger = new Logger(TemplateMessageService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  /**
   * Send an ad-hoc free-text WhatsApp message to a patient. Persists to
   * whatsappLog with type `custom_message` so the message shows up in the
   * per-patient communication history.
   *
   * WhatsApp only delivers free-text inside the 24h customer-service window;
   * outside it the provider rejects the send and the surfaced error bubbles up.
   */
  async handleSendCustomMessage(
    clinicId: string,
    userId: string,
    dto: { patientId: string; text: string },
  ) {
    const patient = await this.persistence.patient.findFirst({
      where: { id: dto.patientId, clinicId },
      select: { phoneNumber: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const phoneNumber = patient.phoneNumber?.trim();
    if (!phoneNumber)
      throw new BadRequestException('Patient does not have a phone number');

    const sendResult = await this.sendMessage.execute({
      clinicId,
      recipientPhone: phoneNumber,
      text: dto.text,
    });

    await this.persistence.whatsappLog.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        type: 'custom_message',
        phoneNumber,
        message: dto.text,
        status: WhatsappLogStatus.SENT,
        providerMessageId: sendResult.providerMessageId,
        senderMode: sendResult.senderMode ?? 'SHARED',
        senderPhoneNumberId: sendResult.senderPhoneNumberId ?? null,
        requestBody: toPrismaInputJsonValue({
          patientId: dto.patientId,
          requestedByUserId: userId,
        }),
      },
    });

    return {
      success: true,
      messageId: sendResult.providerMessageId || sendResult.messageId,
    };
  }
}
