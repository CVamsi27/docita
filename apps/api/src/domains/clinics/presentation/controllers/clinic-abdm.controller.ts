import {
  Controller,
  ForbiddenException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { abdmClinicDashboardSchema } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { ClinicAbdmDashboardService } from '@/domains/clinics/application/services/clinic-abdm-dashboard.service';

class AbdmClinicDashboardDto extends createZodDto(abdmClinicDashboardSchema) {}

@Controller('clinics/abdm')
@UseGuards(TierGuard)
@RequireFeature(Feature.ABDM_INTEGRATION)
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR, Role.RECEPTIONIST)
export class ClinicAbdmController {
  constructor(private readonly dashboard: ClinicAbdmDashboardService) {}

  @Get('dashboard')
  @ZodSerializerDto(AbdmClinicDashboardDto)
  async getDashboard(@Request() req: RequestWithUser) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return this.dashboard.getDashboard(clinicId);
  }
}
