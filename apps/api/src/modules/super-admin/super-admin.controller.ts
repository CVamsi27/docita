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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ClinicTier } from '@workspace/db';
import { ClinicManagementService } from './clinic-management.service';
import { SuperAdminAnalyticsService } from './super-admin-analytics.service';
import { SuperAdminLogService } from './super-admin-log.service';
import { SuperAdminAiService } from './super-admin-ai.service';
import { SuperAdminBillingService } from './super-admin-billing.service';
import {
  CreateClinicDto,
  UpdateClinicDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dto/clinic-management.dto';
import { UpdateAIFeaturesDto } from './dto/ai-management.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(
    private readonly clinicService: ClinicManagementService,
    private readonly analyticsService: SuperAdminAnalyticsService,
    private readonly logService: SuperAdminLogService,
    private readonly aiService: SuperAdminAiService,
    private readonly billingService: SuperAdminBillingService,
  ) {}

  @Get('clinics')
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
  async getClinicDoctors(@Param('id') id: string) {
    return this.clinicService.getClinicDoctors(id);
  }

  @Post('clinics')
  async createClinic(@Body() data: CreateClinicDto) {
    return this.clinicService.createClinic(data);
  }

  @Patch('clinics/:id/tier')
  async updateClinicTier(
    @Param('id') id: string,
    @Body('tier') tier: ClinicTier,
  ) {
    return this.clinicService.updateClinicTier(id, tier);
  }

  @Patch('clinics/:id/status')
  async updateClinicStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.clinicService.updateClinicStatus(id, active);
  }

  @Patch('clinics/:id')
  async updateClinic(@Param('id') id: string, @Body() data: UpdateClinicDto) {
    return this.clinicService.updateClinic(id, data);
  }

  @Get('stats')
  async getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('analytics')
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
  async getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.logService.getLogs(parsedLimit, parsedOffset);
  }

  @Get('performance')
  async getPerformanceMetrics() {
    return this.analyticsService.getPerformanceMetrics();
  }

  // Admin Management Endpoints
  @Get('clinics/:id/admins')
  async getClinicAdmins(@Param('id') id: string) {
    return this.clinicService.getClinicAdmins(id);
  }

  @Post('clinics/:id/admins')
  async createAdmin(
    @Param('id') clinicId: string,
    @Body() data: CreateAdminDto,
  ) {
    return this.clinicService.createAdmin(clinicId, data);
  }

  @Get('admins/:id')
  async getAdminDetails(@Param('id') id: string) {
    return this.clinicService.getAdminDetails(id);
  }

  @Patch('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() data: UpdateAdminDto) {
    return this.clinicService.updateAdmin(id, data);
  }

  @Patch('admins/:id/deactivate')
  async deactivateAdmin(@Param('id') id: string) {
    return this.clinicService.deactivateAdmin(id);
  }

  @Patch('admins/:id/activate')
  async activateAdmin(@Param('id') id: string) {
    return this.clinicService.activateAdmin(id);
  }

  // AI Features Management
  @Get('clinics/:id/ai-features')
  async getClinicAIFeatures(@Param('id') id: string) {
    return this.aiService.getClinicAIFeatures(id);
  }

  @Patch('clinics/:id/ai-features')
  async updateClinicAIFeatures(
    @Param('id') id: string,
    @Body() data: UpdateAIFeaturesDto,
  ) {
    return this.aiService.updateClinicAIFeatures(id, data);
  }

  @Patch('clinics/:id/enable-ai')
  async enableAIFeatures(@Param('id') id: string) {
    return this.aiService.enableAIFeatures(id);
  }

  @Patch('clinics/:id/disable-ai')
  async disableAIFeatures(@Param('id') id: string) {
    return this.aiService.disableAIFeatures(id);
  }

  // Payment & Tier Management
  @Post('clinics/:id/process-payment')
  async processPaymentAndUpdateTier(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.billingService.processPaymentAndUpdateTier(id, data);
  }

  @Get('clinics/:id/tier-info')
  async getClinicTierInfo(@Param('id') id: string) {
    return this.billingService.getClinicTierInfo(id);
  }

  @Post('clinics/:id/upgrade-tier')
  async upgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.upgradeTier(id, newTier);
  }

  @Post('clinics/:id/downgrade-tier')
  async downgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.billingService.downgradeTier(id, newTier);
  }

  @Get('tier-pricing')
  getTierPricingInfo() {
    return this.billingService.getTierPricingInfo();
  }

  @Get('ai-features-catalog')
  getAIFeaturesCatalog() {
    return this.aiService.getAIFeaturesCatalog();
  }
}
