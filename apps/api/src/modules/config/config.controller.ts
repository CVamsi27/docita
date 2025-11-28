import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Public } from '../../auth/public.decorator';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get all form options - PUBLIC endpoint
   * Returns dropdown options for gender, blood group, appointment types, etc.
   */
  @Public()
  @Get('form-options')
  getFormOptions() {
    return this.configService.getFormOptions();
  }

  /**
   * Get patient import field definitions - PUBLIC endpoint
   */
  @Public()
  @Get('patient-import-fields')
  getPatientImportFields() {
    return this.configService.getPatientImportFields();
  }

  /**
   * Get default values - PUBLIC endpoint
   */
  @Public()
  @Get('defaults')
  getDefaults() {
    return this.configService.getDefaults();
  }

  /**
   * Get complete app configuration - PUBLIC endpoint
   * Optionally includes clinic-specific settings if clinicId is provided
   */
  @Public()
  @Get()
  async getAppConfig(@Query('clinicId') clinicId?: string) {
    return this.configService.getAppConfig(clinicId);
  }
}
