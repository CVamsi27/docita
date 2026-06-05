import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import type { ClinicWhatsappSentMessage } from '@workspace/types';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  ClinicWhatsappSentMessageListResponseDto,
  WhatsappLogListResponseDto,
  WhatsappLogsQueryDto,
  WhatsappStatsResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

const PATIENT_SENT_MESSAGES_LIMIT = 50;

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

  /**
   * Outbound-only sent-message history for a single patient. One-way send log
   * (no inbound replies / conversation threading) — powers the patient
   * Messages tab. Readable by every role with WhatsApp access.
   */
  @Get('patients/:patientId/sent-messages')
  @ZodSerializerDto(ClinicWhatsappSentMessageListResponseDto)
  async getPatientSentMessages(
    @Req() req: Request,
    @Param('patientId') patientId: string,
  ): Promise<ClinicWhatsappSentMessage[]> {
    const clinicId = requireClinicId(req);
    const rows = await this.whatsappService.getLogs(clinicId, {
      patientId,
      limit: PATIENT_SENT_MESSAGES_LIMIT,
    });
    return rows.map((row) => ({
      id: row.id,
      message: row.message,
      type: row.type,
      status: row.status,
      phoneNumber: row.phoneNumber,
      createdAt: row.createdAt,
    }));
  }

  @Get('stats')
  @ZodSerializerDto(WhatsappStatsResponseDto)
  async getStats(@Req() req: Request) {
    return this.whatsappService.getWhatsappStats(requireClinicId(req));
  }
}
