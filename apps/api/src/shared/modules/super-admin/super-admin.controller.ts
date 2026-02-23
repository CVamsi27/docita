import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { ClinicTier } from '@workspace/db';
import { ClinicManagementService } from './clinic-management.service';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdminLogService } from './super-admin-log.service';
import { SuperAdminAiService } from './super-admin-ai.service';
import { SuperAdminBillingService } from './super-admin-billing.service';
import {
  SuperAdminCreateClinicDto,
  SuperAdminUpdateClinicDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dto/clinic-management.dto';
import { UpdateAIFeaturesDto } from './dto/ai-management.dto';
import { ProcessPaymentDto } from './dto/payment.dto';
import {
  SuperAdminGlobalStatsResponseDto,
  SuperAdminAnalyticsResponseDto,
  SuperAdminPerformanceMetricsResponseDto,
  SuperAdminAIFeatureCatalogResponseDto,
  SuperAdminClinicTierInfoResponseDto,
  SuperAdminTierPricingResponseDto,
  SuperAdminClinicListResponseDto,
  SuperAdminLogListResponseDto,
  SuperAdminUserListResponseDto,
  SuperAdminUserResponseDto,
  SuccessResponseDto,
} from './dto/super-admin.dto';
import { ClinicResponseDto } from '../../../domains/clinics/dto/clinics.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('super-admin')
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private readonly clinicService: ClinicManagementService,
    private readonly analyticsService: SuperAdminAnalyticsService,
    private readonly logService: SuperAdminLogService,
    private readonly aiService: SuperAdminAiService,
    private readonly billingService: SuperAdminBillingService,
  ) {}

  @Get('clinics')
  @ZodSerializerDto(SuperAdminClinicListResponseDto)
  async getAllClinics(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clinicService.getAllClinics({
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('clinics/:id/doctors')
  @ZodSerializerDto(SuperAdminUserListResponseDto)
  async getClinicDoctors(@Param('id') id: string) {
    return this.clinicService.getClinicDoctors(id);
  }

  @Post('clinics')
  @ZodSerializerDto(ClinicResponseDto)
  async createClinic(@Body() data: SuperAdminCreateClinicDto) {
    return this.clinicService.createClinic(data);
  }

  @Patch('clinics/:id/tier')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinicTier(
    @Param('id') id: string,
    @Body('tier') tier: ClinicTier,
  ) {
    return this.clinicService.updateClinicTier(id, tier);
  }

  @Patch('clinics/:id/status')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinicStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.clinicService.updateClinicStatus(id, active);
  }

  @Patch('clinics/:id')
  @ZodSerializerDto(ClinicResponseDto)
  async updateClinic(
    @Param('id') id: string,
    @Body() data: SuperAdminUpdateClinicDto,
  ) {
    return this.clinicService.updateClinic(id, data);
  }

  @Get('stats')
  async getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('analytics')
  @ZodSerializerDto(SuperAdminAnalyticsResponseDto)
  async getAnalytics(
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'yearly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAnalytics(
      period || 'monthly',
      startDate,
      endDate,
    );
  }

  @Get('logs')
  @ZodSerializerDto(SuperAdminLogListResponseDto)
  async getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.logService.getLogs(parsedLimit, parsedOffset);
  }

  @Get('performance')
  @ZodSerializerDto(SuperAdminPerformanceMetricsResponseDto)
  async getPerformanceMetrics() {
    return this.analyticsService.getPerformanceMetrics();
  }

  // Admin Management Endpoints
  @Get('clinics/:id/admins')
  @ZodSerializerDto(SuperAdminUserListResponseDto)
  async getClinicAdmins(@Param('id') id: string) {
    return this.clinicService.getClinicAdmins(id);
  }

  @Post('clinics/:id/admins')
  @ZodSerializerDto(SuperAdminUserResponseDto)
  async createAdmin(
    @Param('id') clinicId: string,
    @Body() data: CreateAdminDto,
  ) {
    return this.clinicService.createAdmin(clinicId, data);
  }

  @Get('admins/:id')
  @ZodSerializerDto(SuperAdminUserResponseDto)
  async getAdminDetails(@Param('id') id: string) {
    return this.clinicService.getAdminDetails(id);
  }

  @Patch('admins/:id')
  @ZodSerializerDto(SuperAdminUserResponseDto)
  async updateAdmin(@Param('id') id: string, @Body() data: UpdateAdminDto) {
    return this.clinicService.updateAdmin(id, data);
  }

  @Patch('admins/:id/deactivate')
  @ZodSerializerDto(SuperAdminUserResponseDto)
  async deactivateAdmin(@Param('id') id: string) {
    return this.clinicService.deactivateAdmin(id);
  }

  @Patch('admins/:id/activate')
  @ZodSerializerDto(SuperAdminUserResponseDto)
  async activateAdmin(@Param('id') id: string) {
    return this.clinicService.activateAdmin(id);
  }

  // AI Features Management
  @Get('clinics/:id/ai-features')
  // @ZodSerializerDto() // Need schema for this if specific
  async getClinicAIFeatures(@Param('id') id: string) {
    return this.aiService.getClinicAIFeatures(id);
  }

  @Patch('clinics/:id/ai-features')
  @ZodSerializerDto(SuccessResponseDto)
  async updateClinicAIFeatures(
    @Param('id') id: string,
    @Body() data: UpdateAIFeaturesDto,
  ) {
    return this.aiService.updateClinicAIFeatures(id, data);
  }

  @Patch('clinics/:id/enable-ai')
  @ZodSerializerDto(SuccessResponseDto)
  async enableAIFeatures(@Param('id') id: string) {
    return this.aiService.enableAIFeatures(id);
  }

  @Patch('clinics/:id/disable-ai')
  @ZodSerializerDto(SuccessResponseDto)
  async disableAIFeatures(@Param('id') id: string) {
    return this.aiService.disableAIFeatures(id);
  }

  // Payment & Tier Management
  @Post('clinics/:id/process-payment')
  @ZodSerializerDto(SuccessResponseDto)
  async processPaymentAndUpdateTier(
    @Param('id') id: string,
    @Body() data: ProcessPaymentDto,
  ) {
    return this.billingService.processPaymentAndUpdateTier(id, data);
  }

  @Get('clinics/:id/tier-info')
  @ZodSerializerDto(SuperAdminClinicTierInfoResponseDto)
  async getClinicTierInfo(@Param('id') id: string) {
    return this.billingService.getClinicTierInfo(id);
  }

  @Post('clinics/:id/upgrade-tier')
  @ZodSerializerDto(SuccessResponseDto)
  async upgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.upgradeTier(id, newTier);
  }

  @Post('clinics/:id/downgrade-tier')
  @ZodSerializerDto(SuccessResponseDto)
  async downgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.downgradeTier(id, newTier);
  }

  @Get('tier-pricing')
  @ZodSerializerDto(SuperAdminTierPricingResponseDto)
  getTierPricingInfo() {
    return this.billingService.getTierPricingInfo();
  }

  @Get('ai-features-catalog')
  @ZodSerializerDto(SuperAdminAIFeatureCatalogResponseDto)
  getAIFeaturesCatalog() {
    return this.aiService.getAIFeaturesCatalog();
  }
}
