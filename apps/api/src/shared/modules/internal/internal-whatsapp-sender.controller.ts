import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { WhatsappSenderSettingsService } from '@/domains/whatsapp/application/services/whatsapp-sender-settings.service';
import {
  RevokeWhatsappSenderResponseDto,
  UpdateWhatsappSenderDto,
  VerifyWhatsappSenderResponseDto,
  WhatsappSenderConfigResponseDto,
} from '@/domains/whatsapp/application/dto/whatsapp.dto';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { InternalApiAccess } from './internal.controller.access';

@Controller('internal/clinics/:clinicId/whatsapp-sender')
@InternalApiAccess()
export class InternalWhatsappSenderController {
  constructor(private readonly senderSettings: WhatsappSenderSettingsService) {}

  private actorId(req: RequestWithUser): string {
    if (!req.user?.id)
      throw new UnauthorizedException('Internal admin identity missing');
    return req.user.id;
  }

  @Get()
  @ZodSerializerDto(WhatsappSenderConfigResponseDto)
  async get(@Param('clinicId') clinicId: string) {
    return this.senderSettings.getConfig(clinicId);
  }

  @Put()
  @ZodSerializerDto(WhatsappSenderConfigResponseDto)
  async update(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
    @Body() body: UpdateWhatsappSenderDto,
  ) {
    return this.senderSettings.updateConfig(clinicId, this.actorId(req), body, {
      bypassFeatureGate: true,
    });
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(VerifyWhatsappSenderResponseDto)
  async verify(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    return this.senderSettings.verify(clinicId, this.actorId(req));
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RevokeWhatsappSenderResponseDto)
  async revoke(
    @Request() req: RequestWithUser,
    @Param('clinicId') clinicId: string,
  ) {
    return this.senderSettings.revoke(clinicId, this.actorId(req));
  }
}
