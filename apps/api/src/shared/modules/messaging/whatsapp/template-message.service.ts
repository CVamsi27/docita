import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { Prisma, WhatsappLogStatus } from '@workspace/db';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class TemplateMessageService {
  private readonly logger = new Logger(TemplateMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
    private readonly whatsappClient: WhatsappClientService,
  ) {}

  async handleSendTemplate(
    clinicId: string,
    userId: string,
    dto: SendTemplateDto,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const variables = {
      ...dto.variables,
      clinicName: clinic.name,
    };

    const resolved = await this.templatesService.resolveTemplate(
      dto.templateId,
      variables,
      clinicId,
    );

    if (!resolved) {
      throw new BadRequestException(`Template not found: ${dto.templateId}`);
    }

    const message = this.templatesService.getMessageForMode(resolved);

    const result = await this.whatsappClient.sendMessage({
      to: dto.phoneNumber,
      message,
    });

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
        requestBody: toJsonValue(dto),
      },
    });

    return {
      success: true,
      messageId: result.messageId,
      templateId: dto.templateId,
    };
  }
}
