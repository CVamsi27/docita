import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import type { ClinicWhatsappSentMessage } from '@workspace/types';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  ClinicWhatsappSentMessageListResponseDto,
  WhatsappStatsResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/require-clinic-id';

const PATIENT_SENT_MESSAGES_LIMIT = 50;
const CLINIC_RECENT_SENT_LIMIT = 100;

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappLogsController {
  constructor(private readonly whatsappService: WhatsappService) {}

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

  /**
   * Clinic-wide outbound sent-message history (no inbound / conversation
   * threading). Powers the WhatsApp "Sent" tab in the main clinician app.
   * Readable by every role with WhatsApp access.
   */
  @Get('recent-sent')
  @ZodSerializerDto(ClinicWhatsappSentMessageListResponseDto)
  async getRecentSentMessages(
    @Req() req: Request,
  ): Promise<ClinicWhatsappSentMessage[]> {
    const clinicId = requireClinicId(req);
    const rows = await this.whatsappService.getLogs(clinicId, {
      limit: CLINIC_RECENT_SENT_LIMIT,
    });
    return rows.map((row) => ({
      id: row.id,
      message: row.message,
      type: row.type,
      status: row.status,
      phoneNumber: row.phoneNumber,
      createdAt: row.createdAt,
      patientName: row.patient
        ? `${row.patient.firstName} ${row.patient.lastName}`
        : undefined,
    }));
  }

  @Get('stats')
  @ZodSerializerDto(WhatsappStatsResponseDto)
  async getStats(@Req() req: Request) {
    return this.whatsappService.getWhatsappStats(requireClinicId(req));
  }
}
