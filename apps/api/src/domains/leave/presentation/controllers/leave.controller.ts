// jscpd:ignore-start
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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { LeaveService } from '@/domains/leave/application/services/leave.service';
import { Feature } from '@workspace/types';
import {
  ALL_STAFF_ROLES,
// jscpd:ignore-end
  CLINIC_ADMIN_ROLES as ADMIN_ROLES,
} from '@/shared/common/constants/role-groups';

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
    const { clinicId, userId, role } = getClinicStaffRequestContext(req);
    const isAdmin = ADMIN_ROLES.includes(role);
    const targetStaffId = isAdmin && body.staffId ? body.staffId : userId;
    return this.leaveService.applyLeave(targetStaffId, clinicId, body);
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
    const { clinicId, userId, role } = getClinicStaffRequestContext(req);
    const isAdmin = ADMIN_ROLES.includes(role);
    const effectiveStaffId = isAdmin ? staffId : userId;

    return this.leaveService.getLeaves(clinicId, {
      staffId: effectiveStaffId,
      status,
      startDate,
      endDate,
    });
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get leave balance for current user' })
  async getLeaveBalance(@Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.leaveService.getLeaveBalance(userId, clinicId);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Approve a leave request (admin only)' })
  async approveLeave(@Param('id') id: string, @Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.leaveService.approveLeave(id, userId, clinicId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Reject a leave request (admin only)' })
  async rejectLeave(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.leaveService.rejectLeave(
      id,
      userId,
      clinicId,
      rejectionReason || 'No reason provided',
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel own leave request' })
  async cancelLeave(@Param('id') id: string, @Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.leaveService.cancelLeave(id, userId, clinicId);
  }
}
