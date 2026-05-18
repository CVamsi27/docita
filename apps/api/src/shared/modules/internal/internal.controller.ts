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
import { InternalAnalyticsService } from './internal-analytics.service';
import { InternalLogService } from './internal-log.service';
import { InternalAiService } from './internal-ai.service';
import { InternalBillingService } from './internal-billing.service';
import {
  InternalCreateClinicDto,
  InternalUpdateClinicDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dto/clinic-management.dto';
import { UpdateAIFeaturesDto } from './dto/ai-management.dto';
import {
  ProcessPaymentDto,
  RecordInternalAdditionalChargeRequestDto,
} from './dto/payment.dto';
import {
  InternalClinicListQueryDto,
  InternalGlobalStatsResponseDto as _InternalGlobalStatsResponseDto,
  InternalAnalyticsResponseDto,
  InternalPerformanceMetricsResponseDto,
  InternalAIFeatureCatalogResponseDto,
  InternalClinicTierInfoResponseDto,
  InternalTierPricingResponseDto,
  InternalClinicListResponseDto,
  InternalLogListResponseDto,
  InternalUserListResponseDto,
  InternalUserResponseDto,
  SuccessResponseDto,
} from './dto/internal.dto';
import { ClinicResponseDto } from '@/domains/clinics/application/dto/clinics.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { FeedbackService } from '@/domains/feedback/application/services/feedback.service';
import { ContactService } from '@/shared/modules/contact/contact.service';
import {
  SupportWhatsAppInboxService,
  SupportWhatsAppMessageListResponseDto,
  SupportWhatsAppReadResponseDto,
  SupportWhatsAppReplyDto,
  SupportWhatsAppReplyResponseDto,
  SupportWhatsAppThreadListResponseDto,
  SupportWhatsAppThreadMessagesQueryDto,
  SupportWhatsAppThreadsQueryDto,
} from '@/shared/modules/support-whatsapp';
import {
  CreateWhatsAppBroadcastDto,
  WhatsAppBroadcastJobDetailDto,
  WhatsAppBroadcastJobListResponseDto,
  WhatsAppBroadcastJobSummaryDto,
  WhatsAppBroadcastService,
} from '@/shared/modules/whatsapp-broadcast';
import {
  FeedbackListResponseDto,
  FeedbackResponseDto,
  UpdateFeedbackStatusDto,
  UpdateFeedbackStatusSchema,
} from '@/domains/feedback/dto/feedback.dto';
import { ContactInquiryListResponseDto } from '@/shared/modules/contact/dto/contact.dto';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { UsePipes } from '@nestjs/common';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { recordInternalAdditionalChargeRequestSchema } from '@workspace/types';

@Controller('internal')
@Roles(Role.INTERNAL)
export class InternalController {
  constructor(
    private readonly clinicService: ClinicManagementService,
    private readonly analyticsService: InternalAnalyticsService,
    private readonly logService: InternalLogService,
    private readonly aiService: InternalAiService,
    private readonly billingService: InternalBillingService,
    private readonly feedbackService: FeedbackService,
    private readonly contactService: ContactService,
    private readonly supportWhatsAppInboxService: SupportWhatsAppInboxService,
    private readonly whatsAppBroadcastService: WhatsAppBroadcastService,
  ) {}

  @Get('clinics')
  @ZodSerializerDto(InternalClinicListResponseDto)
  async getAllClinics(@Query() query?: InternalClinicListQueryDto) {
    const { cursor, limit } = query ?? {};
    return this.clinicService.getAllClinics({
      cursor,
      limit,
    });
  }

  @Get('clinics/:id/doctors')
  @ZodSerializerDto(InternalUserListResponseDto)
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
  async createClinic(@Body() data: InternalCreateClinicDto) {
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
    @Body() data: InternalUpdateClinicDto,
  ) {
    return this.clinicService.updateClinic(id, data);
  }

  @Get('stats')
  async getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('analytics')
  @ZodSerializerDto(InternalAnalyticsResponseDto)
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
  @ZodSerializerDto(InternalLogListResponseDto)
  async getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('level') level?: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    @Query('module') module?: string,
    @Query('q') q?: string,
  ) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 500 }) ?? 50;
    const parsedOffset = parsePaginationInt(offset, { min: 0 }) ?? 0;
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
      minRating: parsePaginationInt(minRating, { min: 1, max: 5 }),
      maxRating: parsePaginationInt(maxRating, { min: 1, max: 5 }),
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

  @Get('support/inquiries')
  @ZodSerializerDto(ContactInquiryListResponseDto)
  async getSupportInquiries(@Query('limit') limit?: string) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 200 }) ?? 100;
    return this.contactService.listInquiries(parsedLimit);
  }

  @Get('support/whatsapp')
  @ZodSerializerDto(SupportWhatsAppThreadListResponseDto)
  async getSupportWhatsAppThreads(
    @Query() query?: SupportWhatsAppThreadsQueryDto,
  ) {
    const parsedLimit =
      parsePaginationInt(String(query?.limit ?? ''), {
        min: 1,
        max: 200,
      }) ?? 100;
    return this.supportWhatsAppInboxService.listThreads(parsedLimit);
  }

  @Get('support/whatsapp/:threadPhoneNumber/messages')
  @ZodSerializerDto(SupportWhatsAppMessageListResponseDto)
  async getSupportWhatsAppThreadMessages(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
    @Query() query?: SupportWhatsAppThreadMessagesQueryDto,
  ) {
    const parsedLimit =
      parsePaginationInt(String(query?.limit ?? ''), {
        min: 1,
        max: 500,
      }) ?? 500;
    return this.supportWhatsAppInboxService.listThreadMessages(
      threadPhoneNumber,
      parsedLimit,
    );
  }

  @Patch('support/whatsapp/:threadPhoneNumber/read')
  @ZodSerializerDto(SupportWhatsAppReadResponseDto)
  async markSupportWhatsAppThreadRead(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
  ) {
    const updatedCount =
      await this.supportWhatsAppInboxService.markThreadAsRead(
        threadPhoneNumber,
      );

    return { updatedCount };
  }

  @Post('support/whatsapp/:threadPhoneNumber/reply')
  @ZodSerializerDto(SupportWhatsAppReplyResponseDto)
  async replyToSupportWhatsAppThread(
    @Param('threadPhoneNumber') threadPhoneNumber: string,
    @Body() dto: SupportWhatsAppReplyDto,
  ) {
    return this.supportWhatsAppInboxService.replyToThread(
      threadPhoneNumber,
      dto.message,
      dto.replyToProviderMessageId,
    );
  }

  @Get('broadcasts')
  @ZodSerializerDto(WhatsAppBroadcastJobListResponseDto)
  async listBroadcasts(@Query('limit') limit?: string) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 200 }) ?? 50;
    return this.whatsAppBroadcastService.listJobs(parsedLimit);
  }

  @Get('broadcasts/:id')
  @ZodSerializerDto(WhatsAppBroadcastJobDetailDto)
  async getBroadcast(@Param('id') id: string) {
    return this.whatsAppBroadcastService.getJob(id);
  }

  @Post('broadcasts')
  @ZodSerializerDto(WhatsAppBroadcastJobSummaryDto)
  async createBroadcast(@Body() dto: CreateWhatsAppBroadcastDto) {
    return this.whatsAppBroadcastService.createBroadcast(dto);
  }

  @Get('performance')
  @ZodSerializerDto(InternalPerformanceMetricsResponseDto)
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
  @ZodSerializerDto(InternalUserListResponseDto)
  async getClinicAdmins(@Param('id') id: string) {
    return this.clinicService.getClinicAdmins(id);
  }

  @Post('clinics/:id/admins')
  @ZodSerializerDto(InternalUserResponseDto)
  async createAdmin(
    @Param('id') clinicId: string,
    @Body() data: CreateAdminDto,
  ) {
    return this.clinicService.createAdmin(clinicId, data);
  }

  @Get('admins/:id')
  @ZodSerializerDto(InternalUserResponseDto)
  async getAdminDetails(@Param('id') id: string) {
    return this.clinicService.getAdminDetails(id);
  }

  @Patch('admins/:id')
  @ZodSerializerDto(InternalUserResponseDto)
  async updateAdmin(@Param('id') id: string, @Body() data: UpdateAdminDto) {
    return this.clinicService.updateAdmin(id, data);
  }

  @Patch('admins/:id/deactivate')
  @ZodSerializerDto(InternalUserResponseDto)
  async deactivateAdmin(@Param('id') id: string) {
    return this.clinicService.deactivateAdmin(id);
  }

  @Patch('admins/:id/activate')
  @ZodSerializerDto(InternalUserResponseDto)
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

  @Post('clinics/:id/additional-charge')
  async recordAdditionalCharge(
    @Param('id') id: string,
    @Body() data: RecordInternalAdditionalChargeRequestDto,
  ) {
    return this.billingService.recordAdditionalCharge(
      id,
      recordInternalAdditionalChargeRequestSchema.parse(data),
    );
  }

  @Get('clinics/:id/tier-info')
  @ZodSerializerDto(InternalClinicTierInfoResponseDto)
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
  @ZodSerializerDto(InternalTierPricingResponseDto)
  getTierPricingInfo() {
    return this.billingService.getTierPricingInfo();
  }

  @Get('ai-features-catalog')
  @ZodSerializerDto(InternalAIFeatureCatalogResponseDto)
  getAIFeaturesCatalog() {
    return this.aiService.getAIFeaturesCatalog();
  }
}
