import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { UsersService } from '@/domains/users/application/services/users.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';

export interface WhatsAppNotificationConfig {
  type: 'prescription' | 'invoice' | 'reminder' | 'appointment';

  clinicId: string;

  phoneNumber: string;

  message: string;

  entityId?: string;

  templateVariables?: Record<string, string>;
}

export interface WhatsAppNotificationResult {
  sent: boolean;
  reason?: 'disabled' | 'no_phone' | 'error' | 'success';
  messageId?: string;
  error?: Error;
}

const AUTOMATION_FLAGS: Record<string, string> = {
  prescription: 'prescriptionSent',
  invoice: 'invoiceSent',
  reminder: 'reminderEnabled',
  appointment: 'appointmentConfirmation',
};

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  async sendNotification(
    config: WhatsAppNotificationConfig,
  ): Promise<WhatsAppNotificationResult> {
    if (!config.phoneNumber) {
      return { sent: false, reason: 'no_phone' };
    }

    const isEnabled = await this.isAutomationEnabled(
      config.clinicId,
      config.type,
    );
    if (!isEnabled) {
      this.logger.debug(
        `WhatsApp automation disabled for ${config.type} in clinic ${config.clinicId}`,
      );
      return { sent: false, reason: 'disabled' };
    }

    try {
      const result = await this.sendMessage.execute({
        clinicId: config.clinicId,
        recipientPhone: config.phoneNumber,
        templateName: config.templateVariables
          ? `${config.type}_created`
          : undefined,
        variables: config.templateVariables,
        text: config.message,
        metadata: config.entityId ? { entityId: config.entityId } : undefined,
      });

      this.logger.log(
        `Sent ${config.type} WhatsApp notification${config.entityId ? ` for ${config.entityId}` : ''}`,
      );

      return {
        sent: true,
        reason: 'success',
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send ${config.type} WhatsApp notification${config.entityId ? ` for ${config.entityId}` : ''}`,
        error,
      );

      return {
        sent: false,
        reason: 'error',
        error: error as Error,
      };
    }
  }

  async isAutomationEnabled(clinicId: string, type: string): Promise<boolean> {
    if (!clinicId) return false;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation === 'string'
    ) {
      return false;
    }

    const config = clinic.whatsappAutomation as Record<string, boolean>;
    const flag = AUTOMATION_FLAGS[type] || type;

    return config.enabled === true && config[flag] === true;
  }

  async getClinicInfo(clinicId: string) {
    return this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        whatsappAutomation: true,
      },
    });
  }

  private async logMessage(
    config: WhatsAppNotificationConfig,
    success: boolean,
    error?: Error,
  ): Promise<void> {
    try {
      await this.prisma.whatsappLog.create({
        data: {
          clinicId: config.clinicId,
          type: config.type.toUpperCase(),
          phoneNumber: config.phoneNumber,
          message: config.message.substring(0, 500),
          status: success ? 'SENT' : 'FAILED',
          errorMessage: error?.message,
        },
      });
    } catch (logError) {
      this.logger.warn('Failed to log WhatsApp message', logError);
    }
  }
}
