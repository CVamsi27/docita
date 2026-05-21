import { Body, Controller, Logger, Post, Req, UsePipes } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  createMedicineReminderRequestSchema,
  createWhatsAppBroadcastRequestSchema,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  SendTemplateDto,
  sendTemplateSchema,
} from '@/domains/whatsapp/presentation/dto/send-template.dto';
import { WhatsappMessageResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicActor } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappSendController {
  private readonly logger = new Logger(LegacyWhatsappSendController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send')
  @ZodSerializerDto(WhatsappMessageResponseDto)
  @UsePipes(new ZodValidationPipe(sendTemplateSchema))
  async sendTemplateMessage(@Req() req: Request, @Body() dto: SendTemplateDto) {
    const { clinicId, id } = requireClinicActor(req);
    return this.whatsappService.handleSendTemplate(clinicId, id, dto);
  }

  @UsePipes(new ZodValidationPipe(createMedicineReminderRequestSchema))
  @Post('medicine-reminder')
  async createMedicineReminder(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const { clinicId, id } = requireClinicActor(req);
    const parsed = createMedicineReminderRequestSchema.parse(body);
    return this.whatsappService.handleSendTemplate(clinicId, id, {
      templateId: 'medicine_reminder',
      phoneNumber: parsed.patientPhone,
      variables: {
        medicineName: parsed.medicineName,
        dosage: parsed.dosage,
        frequency: parsed.frequency,
        reminderTime: parsed.reminderTime,
      },
    });
  }

  @UsePipes(new ZodValidationPipe(createWhatsAppBroadcastRequestSchema))
  @Post('broadcast')
  async createBroadcast(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const { id: userId, clinicId } = requireClinicActor(req);
    const parsed = createWhatsAppBroadcastRequestSchema.parse(body);
    this.logger.log(
      `WhatsApp campaign requested by ${userId} for clinic ${clinicId}: ${parsed.campaignName}`,
    );
    return { success: true, message: 'Campaign created successfully' };
  }
}
