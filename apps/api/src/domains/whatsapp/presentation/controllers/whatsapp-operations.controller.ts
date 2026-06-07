// jscpd:ignore-start
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import { WhatsappOperationsService } from '@/domains/whatsapp/application/services/whatsapp-operations.service';
import {
  ClinicWhatsappCampaignCancelResponseDto,
// jscpd:ignore-end
  ClinicWhatsappCampaignListResponseDto,
  ClinicWhatsappCampaignPreviewDto,
  ClinicWhatsappCampaignPreviewResponseDto,
  ClinicWhatsappCampaignSummaryDto,
  ClinicWhatsappConversationListResponseDto,
  ClinicWhatsappConversationMessageListResponseDto,
  ClinicWhatsappConversationReadResponseDto,
  ClinicWhatsappConversationReplyDto,
  CreateClinicWhatsappCampaignDto,
  SendWhatsAppMessageResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';

@Controller('whatsapp/operations')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
export class WhatsappOperationsController {
  constructor(private readonly operations: WhatsappOperationsService) {}

  @Get('conversations')
  @ZodSerializerDto(ClinicWhatsappConversationListResponseDto)
  listConversations(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.operations.listConversations(clinicId);
  }

  @Get('conversations/:id/messages')
  @ZodSerializerDto(ClinicWhatsappConversationMessageListResponseDto)
  listMessages(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.operations.listMessages(clinicId, id);
  }

  @Post('conversations/:id/read')
  @ZodSerializerDto(ClinicWhatsappConversationReadResponseDto)
  markRead(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.operations.markRead(clinicId, id);
  }

  @Post('conversations/:id/reply')
  @ZodSerializerDto(SendWhatsAppMessageResponseDto)
  reply(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: ClinicWhatsappConversationReplyDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.operations.reply(clinicId, id, dto.text);
  }

  @Post('campaigns/preview')
  @ZodSerializerDto(ClinicWhatsappCampaignPreviewResponseDto)
  previewCampaign(
    @Request() req: RequestWithUser,
    @Body() dto: ClinicWhatsappCampaignPreviewDto,
  ) {
    const { clinicId, role } = getClinicStaffRequestContext(req);
    return this.operations.previewCampaign(clinicId, dto.patientIds, role);
  }

  @Post('campaigns')
  @ZodSerializerDto(ClinicWhatsappCampaignSummaryDto)
  createCampaign(
    @Request() req: RequestWithUser,
    @Body() dto: CreateClinicWhatsappCampaignDto,
  ) {
    const { clinicId, userId, role } = getClinicStaffRequestContext(req);
    return this.operations.createCampaign(clinicId, userId, role, dto);
  }

  @Get('campaigns')
  @ZodSerializerDto(ClinicWhatsappCampaignListResponseDto)
  listCampaigns(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.operations.listCampaigns(clinicId);
  }

  @Post('campaigns/:id/cancel')
  @ZodSerializerDto(ClinicWhatsappCampaignCancelResponseDto)
  cancelCampaign(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId, userId, role } = getClinicStaffRequestContext(req);
    return this.operations.cancelCampaign(clinicId, userId, role, id);
  }
}
