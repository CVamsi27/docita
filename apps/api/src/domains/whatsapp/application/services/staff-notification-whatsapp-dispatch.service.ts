import { Injectable, Logger } from '@nestjs/common';
import { WhatsappClientService } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.service';
import { TemplateResolutionService } from '@/shared/whatsapp/template-resolution.service';
import { TemplateModeService } from '@/shared/whatsapp/template-mode.service';

@Injectable()
export class StaffNotificationWhatsAppDispatchService {
  private readonly logger = new Logger(
    StaffNotificationWhatsAppDispatchService.name,
  );

  constructor(
    private readonly whatsappClient: WhatsappClientService,
    private readonly templateResolution: TemplateResolutionService,
    private readonly templateMode: TemplateModeService,
  ) {}

  async sendStaffAlert(
    phoneNumber: string,
    clinicId: string,
    title: string,
    message: string,
    templateVariables?: Record<string, string>,
  ): Promise<void> {
    try {
      if (templateVariables) {
        const resolved = await this.templateResolution.resolveTemplate(
          'staff_notification',
          {
            ...templateVariables,
            title,
            message,
          },
          clinicId,
        );

        if (resolved) {
          const messageContent = this.templateMode.getMessageForMode(resolved);
          await this.whatsappClient.sendTextMessage({
            to: phoneNumber,
            message: messageContent,
          });
          return;
        }
      }

      const formattedMessage = `*Staff Alert*\n\n*${title}*\n\n${message}`;
      await this.whatsappClient.sendTextMessage({
        to: phoneNumber,
        message: formattedMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp notification to ${phoneNumber}`,
        error,
      );
    }
  }
}
