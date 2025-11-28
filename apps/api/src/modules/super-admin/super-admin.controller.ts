/* eslint-disable */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ClinicTier } from '@workspace/db';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) { }

  @Get('clinics')
  async getAllClinics() {
    return this.superAdminService.getAllClinics();
  }

  @Post('clinics')
  async createClinic(@Body() data: any) {
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
  async updateClinic(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.updateClinic(id, data);
  }

  @Get('stats')
  async getGlobalStats() {
    return this.superAdminService.getGlobalStats();
  }
}
