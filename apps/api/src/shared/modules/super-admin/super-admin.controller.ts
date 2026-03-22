import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards as _UseGuards,
  Query,
} from '@nestjs/common';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
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
  SuperAdminClinicListQueryDto,
  SuperAdminGlobalStatsResponseDto as _SuperAdminGlobalStatsResponseDto,
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
import { ClinicResponseDto } from '@/domains/clinics/application/dto/clinics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { FeedbackService } from '@/domains/feedback/application/services/feedback.service';
import {
  FeedbackListResponseDto,
  FeedbackResponseDto,
  UpdateFeedbackStatusDto,
  UpdateFeedbackStatusSchema,
} from '@/domains/feedback/dto/feedback.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { UsePipes } from '@nestjs/common';

@Controller('super-admin')
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private readonly clinicService: ClinicManagementService,
    private readonly analyticsService: SuperAdminAnalyticsService,
    private readonly logService: SuperAdminLogService,
    private readonly aiService: SuperAdminAiService,
    private readonly billingService: SuperAdminBillingService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Get('clinics')
  @ZodSerializerDto(SuperAdminClinicListResponseDto)
  async getAllClinics(@Query() query?: SuperAdminClinicListQueryDto) {
    const { cursor, limit } = query ?? {};
    return this.clinicService.getAllClinics({
      cursor,
      limit,
    });
  }

  @Get('clinics/:id/doctors')
  @ZodSerializerDto(SuperAdminUserListResponseDto)
  async getClinicDoctors(@Param('id') id: string) {
    return this.clinicService.getClinicDoctors(id);
  }

  @Get('clinics/:clinicId/doctors/:doctorId')
  async getClinicDoctorDetails(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.clinicService.getClinicDoctorDetails(clinicId, doctorId);
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
    @Query('level') level?: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    @Query('module') module?: string,
    @Query('q') q?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.logService.getLogs(parsedLimit, parsedOffset, {
      level,
      module,
      q,
    });
  }

  @Get('feedback/all')
  @ZodSerializerDto(FeedbackListResponseDto)
  async getAllFeedback(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('search') search?: string,
  ) {
    return this.feedbackService.findAll({
      status,
      category,
      clinicId,
      startDate,
      endDate,
      minRating: minRating ? parseInt(minRating, 10) : undefined,
      maxRating: maxRating ? parseInt(maxRating, 10) : undefined,
      search,
    });
  }

  @Get('feedback/stats')
  async getFeedbackStats(@Query('clinicId') clinicId?: string) {
    return this.feedbackService.getStats(clinicId);
  }

  @Get('feedback/:id')
  @ZodSerializerDto(FeedbackResponseDto)
  async getFeedbackById(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Patch('feedback/:id/status')
  @ZodSerializerDto(FeedbackResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateFeedbackStatusSchema))
  async updateFeedbackStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(id, dto);
  }

  @Delete('feedback/:id')
  async deleteFeedback(@Param('id') id: string) {
    return this.feedbackService.delete(id);
  }

  @Get('performance')
  @ZodSerializerDto(SuperAdminPerformanceMetricsResponseDto)
  async getPerformanceMetrics() {
    return this.analyticsService.getPerformanceMetrics();
  }

  @Get('usage-metrics')
  async getUsageMetrics() {
    return this.analyticsService.getUsageMetrics();
  }

  @Get('tier-distribution')
  async getTierDistribution() {
    return this.analyticsService.getTierDistribution();
  }

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

  @Get('clinics/:id/ai-features')
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
