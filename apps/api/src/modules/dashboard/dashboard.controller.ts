import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';

@Controller('dashboard')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ZodSerializerDto(DashboardStatsResponseDto)
  async getStats(@Request() req) {
    return this.dashboardService.getStats(req.user.clinicId);
  }
}
