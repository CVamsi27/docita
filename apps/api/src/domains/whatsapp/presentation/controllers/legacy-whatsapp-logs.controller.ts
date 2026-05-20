import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  WhatsappLogListResponseDto,
  WhatsappLogsQueryDto,
  WhatsappStatsResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappLogsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('logs')
  @ZodSerializerDto(WhatsappLogListResponseDto)
  async getLogs(@Req() req: Request, @Query() query?: WhatsappLogsQueryDto) {
    const clinicId = requireClinicId(req);
    return this.whatsappService.getLogs(clinicId, {
      limit: query?.limit,
      patientId: query?.patientId,
      type: query?.type,
    });
  }

  @Get('stats')
  @ZodSerializerDto(WhatsappStatsResponseDto)
  async getStats(@Req() req: Request) {
    return this.whatsappService.getWhatsappStats(requireClinicId(req));
  }
}
