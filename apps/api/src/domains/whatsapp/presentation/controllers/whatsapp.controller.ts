import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException as _BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { WhatsAppQueryService } from '@/domains/whatsapp/application/services/whatsapp-query.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import {
  SendWhatsAppMessageDto,
  SendWhatsAppMessageResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

@Controller('whatsapp-v2')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
export class WhatsAppController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly queryService: WhatsAppQueryService,
  ) {}

  @Get('templates')
  async listTemplates(@Request() req: RequestWithUser) {
    return this.queryService.listTemplates(requireClinicIdFromRequest(req));
  }

  @Post('messages/send')
  @ZodSerializerDto(SendWhatsAppMessageResponseDto)
  async sendMessage(
    @Request() req: RequestWithUser,
    @Body() body: SendWhatsAppMessageDto,
  ) {
    return this.sendMessageUseCase.execute({
      clinicId: requireClinicIdFromRequest(req),
      recipientPhone: body.recipientPhone,
      templateName: body.templateName,
      variables: body.variables,
      metadata: body.metadata,
    });
  }
}
