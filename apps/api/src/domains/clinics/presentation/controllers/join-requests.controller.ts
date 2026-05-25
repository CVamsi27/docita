import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role, JoinRequestStatus } from '@workspace/db';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { JoinRequestService } from '@/domains/clinics/application/services/join-request.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  getClinicStaffRequestContext,
  requireAuthenticatedUser,
  requireAuthenticatedUserId,
} from '@/shared/modules/auth/auth/clinic-request-context';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';
import {
  CreateJoinRequestDto,
  ApproveJoinRequestDto,
  RejectJoinRequestDto,
} from '@/domains/clinics/application/dto/join-request.dto';
import {
  requireClinicId,
  requireUser,
  requireUserId,
} from '@/common/utils/request-context.utils';

@Controller('clinics/join-requests')
@SkipSubscriptionCheck()
export class JoinRequestsController {
  private readonly logger = new Logger(JoinRequestsController.name);

  constructor(
    private readonly joinRequestService: JoinRequestService,
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async createJoinRequest(
    @Request() req: RequestWithUser,
    @Body() dto: CreateJoinRequestDto,
  ) {
    const user = requireAuthenticatedUser(req);
    const userId = getAuthenticatedUserId(user) ?? user.id;
    this.logger.log('Creating join request', {
      userId,
      clinicId: dto.clinicId,
    });

    if (user.clinicId) {
      throw new BadRequestException('Already associated with a clinic');
    }

    const existing = await this.joinRequestService.findPending(
      user.id,
      dto.clinicId,
    );

    if (existing) {
      throw new ConflictException('Join request already pending');
    }

    const request = await this.joinRequestService.create({
      userId: user.id,
      clinicId: dto.clinicId,
      requestedRole: dto.requestedRole,
      message: dto.message,
    });

    try {
      await this.staffNotificationService.notifyStaff({
        clinicId: dto.clinicId,
        type: 'MEMBER_JOIN_REQUEST',
        title: 'New Team Member Request',
        message: `${user.name} (${user.email}) requested to join with role ${dto.requestedRole}`,
        data: {
          requestId: request.id,
          userId,
          userName: user.name,
          userEmail: user.email,
          requestedRole: dto.requestedRole,
        },
        priority: 'HIGH',
        sendWhatsApp: true,
        sendInApp: true,
      });
    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }

    return {
      success: true,
      requestId: request.id,
      status: 'PENDING',
      message: 'Join request submitted successfully',
    };
  }

  @Get()
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async listJoinRequests(
    @Request() req: RequestWithUser,
    @Query('status') status?: JoinRequestStatus,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.joinRequestService.findByClinic(clinicId, status);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyJoinRequest(@Request() req: RequestWithUser) {
    const requests = await this.joinRequestService.findUserPendingRequests(
      requireAuthenticatedUserId(req),
    );

    if (requests.length === 0) {
      return null;
    }

    return requests[0];
  }

  @Get('count')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async countPendingRequests(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    const requests = await this.joinRequestService.findByClinic(
      clinicId,
      'PENDING',
    );

    return { count: requests.length };
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @HttpCode(200)
  async approveJoinRequest(
    @Request() req: RequestWithUser,
    @Param('id') requestId: string,
    @Body() dto: ApproveJoinRequestDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    const userName = req.user?.name ?? 'Clinic staff';
    const request = await this.joinRequestService.findById(requestId);

    if (!request || request.clinicId !== clinicId) {
      throw new NotFoundException('Request not found');
    }

    await this.joinRequestService.approve(
      requestId,
      userId,
      userName,
      dto.assignedRole,
      dto.welcomeMessage,
    );

    try {
      await this.staffNotificationService.notifyStaff({
        clinicId,
        doctorId: request.userId,
        type: 'MEMBER_JOIN_APPROVED',
        title: 'Welcome to the Team!',
        message: `Your request to join ${req.clinic?.name || 'the clinic'} has been approved. ${dto.welcomeMessage || ''}`,
        priority: 'HIGH',
        sendWhatsApp: true,
        sendInApp: true,
      });
    } catch (error) {
      this.logger.error('Failed to send approval notification', error);
    }

    return {
      success: true,
      message: 'Request approved successfully',
    };
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  @HttpCode(200)
  async rejectJoinRequest(
    @Request() req: RequestWithUser,
    @Param('id') requestId: string,
    @Body() dto: RejectJoinRequestDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    const userName = req.user?.name ?? 'Clinic staff';
    const request = await this.joinRequestService.findById(requestId);

    if (!request || request.clinicId !== clinicId) {
      throw new NotFoundException('Request not found');
    }

    await this.joinRequestService.reject(
      requestId,
      userId,
      userName,
      dto.reason,
    );

    try {
      await this.staffNotificationService.notifyStaff({
        clinicId,
        doctorId: request.userId,
        type: 'MEMBER_JOIN_REJECTED',
        title: 'Join Request Not Approved',
        message: `Your request to join ${req.clinic?.name || 'the clinic'} was not approved. Reason: ${dto.reason}`,
        priority: 'NORMAL',
        sendWhatsApp: true,
        sendInApp: true,
      });
    } catch (error) {
      this.logger.error('Failed to send rejection notification', error);
    }

    return {
      success: true,
      message: 'Request rejected',
    };
  }

  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async withdrawJoinRequest(
    @Request() req: RequestWithUser,
    @Param('id') requestId: string,
  ) {
    await this.joinRequestService.withdraw(
      requestId,
      requireAuthenticatedUserId(req),
    );

    return {
      success: true,
      message: 'Request withdrawn',
    };
  }
}
