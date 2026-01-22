import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardStatsResponseDto } from './dto/dashboard.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ZodSerializerDto(DashboardStatsResponseDto)
  async getStats(@Request() req) {
    return this.dashboardService.getStats(req.user.clinicId);
  }
}
