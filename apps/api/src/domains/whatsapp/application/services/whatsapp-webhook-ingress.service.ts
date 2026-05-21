import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { AppointmentStatus, WhatsappLogStatus } from '@workspace/db';
import { WhatsAppWebhookPayload } from '@workspace/types';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { SupportWhatsAppInboxService } from '@/shared/modules/support-whatsapp/support-whatsapp-inbox.service';
import { ResponseHandlerService } from '@/domains/whatsapp/application/services/response-handler.service';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { WhatsAppMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { parseStringEnumMember } from '@workspace/utils';

type WebhookChangeValue =
  WhatsAppWebhookPayload['entry'][number]['changes'][number]['value'];

const WHATSAPP_LOG_STATUS_VALUES = Object.values(WhatsappLogStatus);

function toLegacyLogStatus(status: string): WhatsappLogStatus | undefined {
  return (
    parseStringEnumMember(WHATSAPP_LOG_STATUS_VALUES, status.toUpperCase()) ??
    undefined
  );
}

const META_WEBHOOK_STATUS_TO_DOMAIN: Record<
  string,
  WhatsAppMessageStatus | undefined
> = {
  sent: WhatsAppMessageStatus.SENT,
  delivered: WhatsAppMessageStatus.DELIVERED,
  read: WhatsAppMessageStatus.READ,
  failed: WhatsAppMessageStatus.FAILED,
};

@Injectable()
export class WhatsAppWebhookIngressService {
  private readonly logger = new Logger(WhatsAppWebhookIngressService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
    private readonly supportInboxService: SupportWhatsAppInboxService,
    @Inject(forwardRef(() => ResponseHandlerService))
    private readonly responseHandler: ResponseHandlerService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async processIncomingMessages(value: WebhookChangeValue): Promise<void> {
    await this.supportInboxService.recordIncomingMessages(value);

    for (const message of value.messages || []) {
      const contact = value.contacts?.[0];
      const phoneNumber = message.from;
      const profileName = contact?.profile?.name;

      this.logger.log(
        `Incoming WhatsApp from ${phoneNumber} (${profileName}): type=${message.type}`,
      );

      let responseText = '';
      let buttonId = '';

      if (message.type === 'text' && message.text) {
        responseText = message.text.body;
      } else if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.button_reply) {
          buttonId = message.interactive.button_reply.id;
          responseText = message.interactive.button_reply.title;
        } else if (message.interactive.list_reply) {
          buttonId = message.interactive.list_reply.id;
          responseText = message.interactive.list_reply.title;
        }
      } else if (message.type === 'button' && message.button) {
        buttonId = message.button.payload;
        responseText = message.button.text;
      }

      const response = buttonId || responseText;

      if (!response) {
        continue;
      }

      try {
        const recentAppointment =
          await this.findRecentAppointmentByPhone(phoneNumber);
        if (recentAppointment) {
          await this.responseHandler.handlePatientResponse(
            recentAppointment.id,
            response,
            phoneNumber,
            message.id,
          );
        } else {
          this.logger.warn(
            `No recent appointment found for phone: ${phoneNumber}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error processing incoming message from ${phoneNumber}:`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  async processStatusUpdates(value: WebhookChangeValue): Promise<void> {
    for (const status of value.statuses || []) {
      this.logger.log(`Status update for ${status.id}: ${status.status}`);

      await this.syncLegacyWhatsappLog(status);
      await this.syncDomainMessageStatus(status);
      await this.syncSupportInboxStatus(status);
    }
  }

  private async syncLegacyWhatsappLog(
    status: NonNullable<WebhookChangeValue['statuses']>[number],
  ): Promise<void> {
    try {
      const log = await this.persistence.whatsappLog.findFirst({
        where: { providerMessageId: status.id },
      });

      if (!log) {
        return;
      }

      const logStatus = toLegacyLogStatus(status.status);
      if (!logStatus) {
        return;
      }

      const updateData: Record<string, unknown> = {
        status: logStatus,
        responseBody: toPrismaInputJsonValue(status),
      };

      if (status.status === 'delivered' || status.status === 'read') {
        updateData.deliveredAt = new Date(
          parseInt(status.timestamp, 10) * 1000,
        );
      }

      if (status.status === 'failed' && status.errors?.length) {
        updateData.errorMessage = status.errors
          .map((e) => `${e.code}: ${e.title}`)
          .join('; ');
      }

      await this.persistence.whatsappLog.update({
        where: { id: log.id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error('Error processing WhatsApp log status update:', error);
    }
  }

  private async syncDomainMessageStatus(
    status: NonNullable<WebhookChangeValue['statuses']>[number],
  ): Promise<void> {
    const message = await this.repository.findMessageByExternalId(status.id);
    if (!message) {
      this.logger.warn(`Message with external ID ${status.id} not found`);
      return;
    }

    const domainStatus = META_WEBHOOK_STATUS_TO_DOMAIN[status.status];
    if (!domainStatus) {
      return;
    }

    if (
      domainStatus === WhatsAppMessageStatus.FAILED &&
      status.errors &&
      status.errors.length > 0
    ) {
      const error = status.errors[0];
      message.setError(
        String(error.code),
        typeof error.message === 'string' ? error.message : 'Unknown error',
        this.clock.now(),
      );
    } else {
      message.updateStatus(domainStatus, this.clock.now());
    }

    await this.repository.saveMessage(message);
    this.logger.log(`Updated message ${message.id} status to ${domainStatus}`);
  }

  private async syncSupportInboxStatus(
    status: NonNullable<WebhookChangeValue['statuses']>[number],
  ): Promise<void> {
    try {
      await this.supportInboxService.updateMessageStatus(
        status.id,
        status.status,
        status.errors?.[0],
      );
    } catch (error) {
      this.logger.error('Error updating support inbox status:', error);
    }
  }

  private async findRecentAppointmentByPhone(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const phoneVariants = [
      phoneNumber,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.slice(-10),
    ];

    const patient = await this.persistence.patient.findFirst({
      where: {
        phoneNumber: { in: phoneVariants },
      },
      select: { id: true },
    });

    if (!patient) return null;

    const now = this.clock.now();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    return this.persistence.appointment.findFirst({
      where: {
        patientId: patient.id,
        startTime: { gte: twoHoursAgo },
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }
}
