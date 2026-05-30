import { Controller, Get, Request } from '@nestjs/common';
import { CacheDuration } from '@/shared/common/interceptors/cache.interceptor';
import { ConfigService } from './config.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { AllowNoClinic } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { SkipPasswordExpiry } from '@/shared/modules/auth/guards/password-expired.guard';
import { SkipEmailVerification } from '@/shared/modules/auth/guards/email-verified.guard';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import {
  FormOptionsResponseDto,
  AppConstantsResponseDto,
  PatientImportFieldsResponseDto,
  AppDefaultsResponseDto,
  AppConfigResponseDto,
} from './dto/config.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get('form-options')
  @CacheDuration(3600)
  @ZodSerializerDto(FormOptionsResponseDto)
  getFormOptions() {
    return this.configService.getFormOptions();
  }

  @Public()
  @Get('constants')
  @CacheDuration(3600)
  @ZodSerializerDto(AppConstantsResponseDto)
  getConstants() {
    return this.configService.getConstants();
  }

  @Public()
  @Get('patient-import-fields')
  @CacheDuration(3600)
  @ZodSerializerDto(PatientImportFieldsResponseDto)
  getPatientImportFields() {
    return this.configService.getPatientImportFields();
  }

  @Public()
  @Get('defaults')
  @CacheDuration(3600)
  @ZodSerializerDto(AppDefaultsResponseDto)
  getDefaults() {
    return this.configService.getDefaults();
  }

  @Get()
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @CacheDuration(3600)
  @ZodSerializerDto(AppConfigResponseDto)
  async getAppConfig(@Request() req: RequestWithUser) {
    const clinicId =
      typeof req.user?.clinicId === 'string' ? req.user.clinicId : undefined;
    return this.configService.getAppConfig(clinicId);
  }
}
