import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

import { UsersService } from '../../../domains/users/application/services/users.service';
import { SendMessageUseCase } from '../../../domains/whatsapp/application/use-cases/send-message.use-case';

/**
 * Configuration for sending WhatsApp notifications
 */
export interface WhatsAppNotificationConfig {
  /** The notification type - determines which automation flag to check */
  type: 'prescription' | 'invoice' | 'reminder' | 'appointment';
  /** Clinic ID to check automation settings */
  clinicId: string;
  /** Recipient phone number */
  phoneNumber: string;
  /** Message content to send */
  message: string;
  /** Optional entity ID for logging */
  entityId?: string;
  /** Optional template variables for template-based messages */
  templateVariables?: Record<string, string>;
}

/**
 * Result of a WhatsApp notification attempt
 */
export interface WhatsAppNotificationResult {
  sent: boolean;
  reason?: 'disabled' | 'no_phone' | 'error' | 'success';
  messageId?: string;
  error?: Error;
}

/**
 * Mapping of notification types to their automation config flags
 */
const AUTOMATION_FLAGS: Record<string, string> = {
  prescription: 'prescriptionSent',
  invoice: 'invoiceSent',
  reminder: 'reminderEnabled',
  appointment: 'appointmentConfirmation',
};

/**
 * Centralized service for sending WhatsApp notifications.
 *
 * Consolidates the duplicated WhatsApp notification pattern found across:
 * - InvoicesService.sendInvoiceWhatsAppNotification
 * - PrescriptionsService.sendPrescriptionWhatsAppNotification
 * - RemindersService.sendReminderWhatsAppNotification
 */
@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  /**
   * Send a WhatsApp notification if automation is enabled for the clinic
   *
   * @param config Notification configuration
   * @returns Result indicating if message was sent and any errors
   */
  async sendNotification(
    config: WhatsAppNotificationConfig,
  ): Promise<WhatsAppNotificationResult> {
    // Validate phone number
    if (!config.phoneNumber) {
      return { sent: false, reason: 'no_phone' };
    }

    // Check if automation is enabled
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

    // Send the message using the new DDD use case
    // Note: We use the manual 'message' content as 'text' if templateVariables aren't provided
    // but the DDD use case prefers templateName.
    // For legacy support, if message is provided and no templateVariables, we might need a way to send raw text.
    // Our SendMessageUseCase supports 'text' if templateName is not found or in sandbox?
    // Let's check SendMessageUseCase execute method again.

    try {
      const result = await this.sendMessage.execute({
        clinicId: config.clinicId,
        recipientPhone: config.phoneNumber,
        templateName: config.templateVariables
          ? `${config.type}_created`
          : undefined,
        variables: config.templateVariables,
        text: config.message, // Fallback to raw text if template resolution fails or is not requested
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

  /**
   * Check if WhatsApp automation is enabled for a specific notification type
   */
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

  /**
   * Get clinic info with automation settings
   */
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

  /**
   * Log WhatsApp message to database
   */
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
          message: config.message.substring(0, 500), // Limit message length
          status: success ? 'SENT' : 'FAILED',
          errorMessage: error?.message,
        },
      });
    } catch (logError) {
      // Don't fail the notification if logging fails
      this.logger.warn('Failed to log WhatsApp message', logError);
    }
  }
}
