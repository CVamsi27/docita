import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('dashboard')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private getClinicId(req: RequestWithUser): string {
    if (!req.user?.clinicId) {
      throw new UnauthorizedException('User clinic not found');
    }
    return req.user.clinicId;
  }

  @Get('stats')
  @ZodSerializerDto(DashboardStatsResponseDto)
  async getStats(@Request() req: RequestWithUser) {
    return this.dashboardService.getStats(this.getClinicId(req));
  }
}
