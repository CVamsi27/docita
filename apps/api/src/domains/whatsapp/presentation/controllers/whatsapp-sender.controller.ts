// jscpd:ignore-start
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Request,
  UseGuards,
  ServiceUnavailableException,
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
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WhatsappSenderSettingsService } from '@/domains/whatsapp/application/services/whatsapp-sender-settings.service';
import {
  RevokeWhatsappSenderResponseDto,
// jscpd:ignore-end
  UpdateWhatsappSenderDto,
  VerifyWhatsappSenderResponseDto,
  WhatsappSenderConfigResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';

@Controller('whatsapp/sender')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP_SENDER))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP_SENDER))
export class WhatsappSenderController {
  constructor(
    private readonly senderSettings: WhatsappSenderSettingsService,
    private readonly configService: AppConfigService,
  ) {}

  @Get()
  @ZodSerializerDto(WhatsappSenderConfigResponseDto)
  async get(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.senderSettings.getConfig(clinicId);
  }

  @Put()
  @ZodSerializerDto(WhatsappSenderConfigResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Body() body: UpdateWhatsappSenderDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.senderSettings.updateConfig(clinicId, userId, body);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(VerifyWhatsappSenderResponseDto)
  async verify(@Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.senderSettings.verify(clinicId, userId);
  }

  @Post('managed-onboarding/start')
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  startManagedOnboarding() {
    if (!this.configService.isPerClinicWhatsappSenderEnabled()) {
      throw new ServiceUnavailableException(
        'Per-clinic WhatsApp sender settings are not enabled.',
      );
    }
    throw new ServiceUnavailableException(
      'Managed WhatsApp onboarding is pending Docita support provisioning.',
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RevokeWhatsappSenderResponseDto)
  async revoke(@Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.senderSettings.revoke(clinicId, userId);
  }
}
