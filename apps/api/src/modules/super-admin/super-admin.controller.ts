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

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('clinics')
  async getAllClinics() {
    return this.superAdminService.getAllClinics();
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
}
