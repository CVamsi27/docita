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
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ClinicTier } from '@workspace/db';

interface CreateClinicDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  tier?: ClinicTier;
}

interface UpdateClinicDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tier?: ClinicTier;
  active?: boolean;
}

interface CreateAdminDto {
  clinicId: string;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  adminType: 'admin' | 'admin_doctor'; // admin for clinics with multiple doctors, admin_doctor for single-doctor clinics
}

interface UpdateAdminDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  adminType?: 'admin' | 'admin_doctor';
}

interface UpdateAIFeaturesDto {
  enabled: boolean;
  features?: {
    predictiveAnalytics?: boolean;
    automatedDiagnosis?: boolean;
    patientInsights?: boolean;
    appointmentOptimization?: boolean;
    prescriptionAssistant?: boolean;
  };
}

interface ProcessPaymentDto {
  paymentId: string;
  amount: number;
  currency: string;
  newTier: ClinicTier;
  paymentMethod: 'razorpay' | 'stripe' | 'bank_transfer' | 'manual';
  notes?: string;
}

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('clinics')
  async getAllClinics(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.getAllClinics({
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('clinics/:id/doctors')
  async getClinicDoctors(@Param('id') id: string) {
    return this.superAdminService.getClinicDoctors(id);
  }

  @Post('clinics')
  async createClinic(@Body() data: CreateClinicDto) {
    return this.superAdminService.createClinic(data);
  }

  @Patch('clinics/:id/tier')
  async updateClinicTier(
    @Param('id') id: string,
    @Body('tier') tier: ClinicTier,
  ) {
    return this.superAdminService.updateClinicTier(id, tier);
  }

  @Patch('clinics/:id/status')
  async updateClinicStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.superAdminService.updateClinicStatus(id, active);
  }

  @Patch('clinics/:id')
  async updateClinic(@Param('id') id: string, @Body() data: UpdateClinicDto) {
    return this.superAdminService.updateClinic(id, data);
  }

  @Get('stats')
  async getGlobalStats() {
    return this.superAdminService.getGlobalStats();
  }

  @Get('analytics')
  async getAnalytics(@Query('period') period: 'week' | 'month' | 'year') {
    return this.superAdminService.getAnalytics(period);
  }

  @Get('logs')
  async getLogs(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.superAdminService.getLogs(limit, offset);
  }

  @Get('performance')
  async getPerformanceMetrics() {
    return this.superAdminService.getPerformanceMetrics();
  }

  // Admin Management Endpoints
  @Get('clinics/:id/admins')
  async getClinicAdmins(@Param('id') id: string) {
    return this.superAdminService.getClinicAdmins(id);
  }

  @Post('clinics/:id/admins')
  async createAdmin(
    @Param('id') clinicId: string,
    @Body() data: CreateAdminDto,
  ) {
    return this.superAdminService.createAdmin(clinicId, data);
  }

  @Get('admins/:id')
  async getAdminDetails(@Param('id') id: string) {
    return this.superAdminService.getAdminDetails(id);
  }

  @Patch('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() data: UpdateAdminDto) {
    return this.superAdminService.updateAdmin(id, data);
  }

  @Patch('admins/:id/deactivate')
  async deactivateAdmin(@Param('id') id: string) {
    return this.superAdminService.deactivateAdmin(id);
  }

  @Patch('admins/:id/activate')
  async activateAdmin(@Param('id') id: string) {
    return this.superAdminService.activateAdmin(id);
  }

  // AI Features Management
  @Get('clinics/:id/ai-features')
  async getClinicAIFeatures(@Param('id') id: string) {
    return this.superAdminService.getClinicAIFeatures(id);
  }

  @Patch('clinics/:id/ai-features')
  async updateClinicAIFeatures(
    @Param('id') id: string,
    @Body() data: UpdateAIFeaturesDto,
  ) {
    return this.superAdminService.updateClinicAIFeatures(id, data);
  }

  @Patch('clinics/:id/enable-ai')
  async enableAIFeatures(@Param('id') id: string) {
    return this.superAdminService.enableAIFeatures(id);
  }

  @Patch('clinics/:id/disable-ai')
  async disableAIFeatures(@Param('id') id: string) {
    return this.superAdminService.disableAIFeatures(id);
  }

  // Payment & Tier Management
  @Post('clinics/:id/process-payment')
  async processPaymentAndUpdateTier(
    @Param('id') id: string,
    @Body() data: ProcessPaymentDto,
  ) {
    return this.superAdminService.processPaymentAndUpdateTier(id, data);
  }

  @Get('clinics/:id/tier-info')
  async getClinicTierInfo(@Param('id') id: string) {
    return this.superAdminService.getClinicTierInfo(id);
  }

  @Post('clinics/:id/upgrade-tier')
  async upgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.superAdminService.upgradeTier(id, newTier);
  }

  @Post('clinics/:id/downgrade-tier')
  async downgradeTier(
    @Param('id') id: string,
    @Body('newTier') newTier: ClinicTier,
  ) {
    return this.superAdminService.downgradeTier(id, newTier);
  }

  @Get('tier-pricing')
  getTierPricingInfo() {
    return this.superAdminService.getTierPricingInfo();
  }

  @Get('ai-features-catalog')
  getAIFeaturesCatalog() {
    return this.superAdminService.getAIFeaturesCatalog();
  }
}
