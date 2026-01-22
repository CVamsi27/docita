import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Public } from '../auth/public.decorator';
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

  /**
   * Get all form options - PUBLIC endpoint
   * Returns dropdown options for gender, blood group, appointment types, etc.
   */
  @Public()
  @Get('form-options')
  @ZodSerializerDto(FormOptionsResponseDto)
  getFormOptions() {
    return this.configService.getFormOptions();
  }

  /**
   * Get global app constants - PUBLIC endpoint
   */
  @Public()
  @Get('constants')
  @ZodSerializerDto(AppConstantsResponseDto)
  getConstants() {
    return this.configService.getConstants();
  }

  /**
   * Get patient import field definitions - PUBLIC endpoint
   */
  @Public()
  @Get('patient-import-fields')
  @ZodSerializerDto(PatientImportFieldsResponseDto)
  getPatientImportFields() {
    return this.configService.getPatientImportFields();
  }

  /**
   * Get default values - PUBLIC endpoint
   */
  @Public()
  @Get('defaults')
  @ZodSerializerDto(AppDefaultsResponseDto)
  getDefaults() {
    return this.configService.getDefaults();
  }

  /**
   * Get complete app configuration - PUBLIC endpoint
   * Optionally includes clinic-specific settings if clinicId is provided
   */
  @Public()
  @Get()
  @ZodSerializerDto(AppConfigResponseDto)
  async getAppConfig(@Query('clinicId') clinicId?: string) {
    return this.configService.getAppConfig(clinicId);
  }
}
