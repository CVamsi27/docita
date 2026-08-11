import {
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
  sendWhatsAppCustomMessageRequestSchema,
  type SendWhatsAppCustomMessageRequest,
} from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { TemplateMessageService } from '@/domains/whatsapp/application/services/template-message.service';
import { SendWhatsappCustomMessageResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicActor } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappSendController {
  constructor(private readonly templateMessageService: TemplateMessageService) {}

  @UsePipes(new ZodValidationPipe(sendWhatsAppCustomMessageRequestSchema))
  @HttpCode(HttpStatus.OK)
  @Post('send-custom')
  @ZodSerializerDto(SendWhatsappCustomMessageResponseDto)
  async sendCustomMessage(
    @Req() req: Request,
    @Body() dto: SendWhatsAppCustomMessageRequest,
  ) {
    const { clinicId, id } = requireClinicActor(req);
    return this.templateMessageService.handleSendCustomMessage(clinicId, id, dto);
  }
}
