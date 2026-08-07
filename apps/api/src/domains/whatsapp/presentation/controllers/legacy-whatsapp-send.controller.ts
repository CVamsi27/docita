import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  createMedicineReminderRequestSchema,
  createWhatsAppBroadcastRequestSchema,
  sendWhatsAppCustomMessageRequestSchema,
  type SendWhatsAppCustomMessageRequest,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  SendTemplateDto,
  sendTemplateSchema,
} from '@/domains/whatsapp/presentation/dto/send-template.dto';
import {
  SendWhatsappCustomMessageResponseDto,
  WhatsappMessageResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicActor } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappSendController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @HttpCode(HttpStatus.OK)
  @Post('send')
  @ZodSerializerDto(WhatsappMessageResponseDto)
  @UsePipes(new ZodValidationPipe(sendTemplateSchema))
  async sendTemplateMessage(@Req() req: Request, @Body() dto: SendTemplateDto) {
    const { clinicId, id } = requireClinicActor(req);
    return this.whatsappService.handleSendTemplate(clinicId, id, dto);
  }

  @UsePipes(new ZodValidationPipe(sendWhatsAppCustomMessageRequestSchema))
  @HttpCode(HttpStatus.OK)
  @Post('send-custom')
  @ZodSerializerDto(SendWhatsappCustomMessageResponseDto)
  async sendCustomMessage(
    @Req() req: Request,
    @Body() dto: SendWhatsAppCustomMessageRequest,
  ) {
    const { clinicId, id } = requireClinicActor(req);
    return this.whatsappService.handleSendCustomMessage(clinicId, id, dto);
  }

  @UsePipes(new ZodValidationPipe(createMedicineReminderRequestSchema))
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
  @Post('broadcast')
  async createBroadcast(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    createWhatsAppBroadcastRequestSchema.parse(body);
    requireClinicActor(req);
    throw new BadRequestException(
      'This campaign endpoint has been retired. Use the WhatsApp operations campaign flow.',
    );
  }
}
