import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
import { LeaveService } from '@/domains/leave/application/services/leave.service';
import { Feature } from '@workspace/types';
import {
  ALL_STAFF_ROLES,
  CLINIC_ADMIN_ROLES as ADMIN_ROLES,
} from '@/common/constants/role-groups';
import {
  requireClinicId,
  requireUserId,
  requireUserRole,
} from '@/common/utils/request-context.utils';

@ApiTags('leaves')
@Controller('leaves')
@UseGuards(TierGuard)
@RequireFeature(Feature.LEAVE_MANAGEMENT)
@Roles(...ALL_STAFF_ROLES)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Apply for leave' })
  async applyLeave(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
      staffId?: string;
    },
  ) {
    const isAdmin = ADMIN_ROLES.includes(requireUserRole(req) as Role);
    const targetStaffId =
      isAdmin && body.staffId ? body.staffId : requireUserId(req);
    return this.leaveService.applyLeave(
      targetStaffId,
      requireClinicId(req),
      body,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List leaves' })
  async getLeaves(
    @Request() req: RequestWithUser,
    @Query('staffId') staffId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isAdmin = ADMIN_ROLES.includes(requireUserRole(req) as Role);
    const effectiveStaffId = isAdmin ? staffId : requireUserId(req);

    return this.leaveService.getLeaves(requireClinicId(req), {
      staffId: effectiveStaffId,
      status,
      startDate,
      endDate,
    });
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get leave balance for current user' })
  async getLeaveBalance(@Request() req: RequestWithUser) {
    return this.leaveService.getLeaveBalance(
      requireUserId(req),
      requireClinicId(req),
    );
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a leave request (admin only)' })
  async approveLeave(@Param('id') id: string, @Request() req: RequestWithUser) {
    if (!ADMIN_ROLES.includes(requireUserRole(req) as Role)) {
      throw new ForbiddenException('Only admins can approve leave');
    }
    return this.leaveService.approveLeave(
      id,
      requireUserId(req),
      requireClinicId(req),
    );
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a leave request (admin only)' })
  async rejectLeave(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    if (!ADMIN_ROLES.includes(requireUserRole(req) as Role)) {
      throw new ForbiddenException('Only admins can reject leave');
    }
    return this.leaveService.rejectLeave(
      id,
      requireUserId(req),
      requireClinicId(req),
      rejectionReason || 'No reason provided',
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel own leave request' })
  async cancelLeave(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.leaveService.cancelLeave(
      id,
      requireUserId(req),
      requireClinicId(req),
    );
  }
}
