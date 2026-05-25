import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  SuccessResponseDto,
  WhatsappDefaultTemplatesResponseDto,
  WhatsappTemplateListResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappTemplatesController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  @ZodSerializerDto(WhatsappTemplateListResponseDto)
  async listTemplates(@Req() req: Request) {
    return this.whatsappService.listTemplates(requireClinicId(req));
  }

  @Get('templates/defaults')
  @ZodSerializerDto(WhatsappDefaultTemplatesResponseDto)
  getDefaultTemplates() {
    return this.whatsappService.getDefaultTemplateNames();
  }

  @Post('templates/seed')
  @ZodSerializerDto(SuccessResponseDto)
  async seedTemplates(@Req() req: Request) {
    const clinicId = requireClinicId(req);
    await this.whatsappService.seedDefaultTemplates(clinicId);
    return { success: true, message: 'Templates seeded successfully' };
  }
}
