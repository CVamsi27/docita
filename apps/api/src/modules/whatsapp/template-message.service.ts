import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { WhatsappLogStatus } from '@workspace/db';

/**
 * Handles generic template message sending and custom messaging
 */
@Injectable()
export class TemplateMessageService {
  private readonly logger = new Logger(TemplateMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
    private readonly whatsappClient: WhatsappClientService,
  ) {}

  /**
   * Handle sending a template message (Business Logic)
   */
  async handleSendTemplate(
    clinicId: string,
    userId: string,
    dto: SendTemplateDto,
  ) {
    // Get clinic info for the template
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Add clinic name to variables
    const variables = {
      ...dto.variables,
      clinicName: clinic.name,
    };

    // Resolve template with variables
    const resolved = await this.templatesService.resolveTemplate(
      dto.templateId,
      variables,
      clinicId,
    );

    if (!resolved) {
      throw new BadRequestException(`Template not found: ${dto.templateId}`);
    }

    // Get the message to send based on mode (sandbox vs production)
    const message = this.templatesService.getMessageForMode(resolved);

    // Send via WhatsApp Client
    const result = await this.whatsappClient.sendMessage({
      to: dto.phoneNumber,
      message,
    });

    // Log the message
    await this.prisma.whatsappLog.create({
      data: {
        clinicId: clinicId,
        patientId: dto.patientId,
        prescriptionId: dto.prescriptionId,
        invoiceId: dto.invoiceId,
        type: dto.templateId,
        phoneNumber: dto.phoneNumber,
        message,
        status: WhatsappLogStatus.SENT,
        providerMessageId: result.messageId,
        requestBody: dto as any,
      },
    });

    return {
      success: true,
      messageId: result.messageId,
      templateId: dto.templateId,
    };
  }
}
