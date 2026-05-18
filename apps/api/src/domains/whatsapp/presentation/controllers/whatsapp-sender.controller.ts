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
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WhatsappSenderSettingsService } from '@/domains/whatsapp/application/services/whatsapp-sender-settings.service';
import {
  RevokeWhatsappSenderResponseDto,
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
    return this.senderSettings.getConfig(req.user!.clinicId!);
  }

  @Put()
  @ZodSerializerDto(WhatsappSenderConfigResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Body() body: UpdateWhatsappSenderDto,
  ) {
    return this.senderSettings.updateConfig(
      req.user!.clinicId!,
      req.user!.id,
      body,
    );
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(VerifyWhatsappSenderResponseDto)
  async verify(@Request() req: RequestWithUser) {
    return this.senderSettings.verify(req.user!.clinicId!, req.user!.id);
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
    return this.senderSettings.revoke(req.user!.clinicId!, req.user!.id);
  }
}
