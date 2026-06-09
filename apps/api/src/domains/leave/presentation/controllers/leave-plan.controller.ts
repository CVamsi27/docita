// jscpd:ignore-start
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { LeavePlanService } from '@/domains/leave/application/services/leave-plan.service';
import { Feature } from '@workspace/types';
import { ALL_STAFF_ROLES } from '@/shared/common/constants/role-groups';

@ApiTags('leave-plans')
// jscpd:ignore-end
@Controller('leave-plans')
@UseGuards(TierGuard)
@RequireFeature(Feature.LEAVE_MANAGEMENT)
@Roles(...ALL_STAFF_ROLES)
export class LeavePlanController {
  constructor(private readonly leavePlanService: LeavePlanService) {}

  @Get()
  @ApiOperation({ summary: 'List leave plans for the clinic' })
  async getPlans(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.leavePlanService.getPlans(clinicId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Create or update a leave plan (admin only)' })
  async createPlan(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      leaveType: string;
      annualQuota: number;
      carryForward?: boolean;
      maxCarryForward?: number;
      isActive?: boolean;
    },
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.leavePlanService.createPlan(clinicId, body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Update a leave plan (admin only)' })
  async updatePlan(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body()
    body: {
      annualQuota?: number;
      carryForward?: boolean;
      maxCarryForward?: number;
      isActive?: boolean;
    },
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.leavePlanService.updatePlan(id, clinicId, body);
  }
}
