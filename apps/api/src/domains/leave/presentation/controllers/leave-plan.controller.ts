import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { LeavePlanService } from '@/domains/leave/application/services/leave-plan.service';
import { Feature } from '@workspace/types';
import {
  ALL_STAFF_ROLES,
  CLINIC_ADMIN_ROLES as ADMIN_ROLES,
} from '@/common/constants/role-groups';
import {
  requireClinicId,
  requireUserRole,
} from '@/common/utils/request-context.utils';

@ApiTags('leave-plans')
@Controller('leave-plans')
@UseGuards(TierGuard)
@RequireFeature(Feature.LEAVE_MANAGEMENT)
@Roles(...ALL_STAFF_ROLES)
export class LeavePlanController {
  constructor(private readonly leavePlanService: LeavePlanService) {}

  @Get()
  @ApiOperation({ summary: 'List leave plans for the clinic' })
  async getPlans(@Request() req: RequestWithUser) {
    return this.leavePlanService.getPlans(requireClinicId(req));
  }

  @Post()
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
    if (!ADMIN_ROLES.includes(requireUserRole(req) as Role)) {
      throw new ForbiddenException('Only admins can manage leave plans');
    }
    return this.leavePlanService.createPlan(requireClinicId(req), body);
  }

  @Put(':id')
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
    if (!ADMIN_ROLES.includes(requireUserRole(req) as Role)) {
      throw new ForbiddenException('Only admins can manage leave plans');
    }
    return this.leavePlanService.updatePlan(id, requireClinicId(req), body);
  }
}
