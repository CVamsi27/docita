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
import { StaffNotificationService } from '@/shared/modules/messaging/whatsapp/staff-notification.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  CreateJoinRequestDto,
  ApproveJoinRequestDto,
  RejectJoinRequestDto,
} from '@/domains/clinics/application/dto/join-request.dto';

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
    const user = req.user!;
    this.logger.log('Creating join request', {
      userId: user.id,
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
        message: `${user.name} (${user.email}) requested to join as ${dto.requestedRole}`,
        data: {
          requestId: request.id,
          userId: user.id,
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
    return this.joinRequestService.findByClinic(req.user!.clinicId!, status);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyJoinRequest(@Request() req: RequestWithUser) {
    const requests = await this.joinRequestService.findUserPendingRequests(
      req.user!.id,
    );

    if (requests.length === 0) {
      return null;
    }

    return requests[0];
  }

  @Get('count')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async countPendingRequests(@Request() req: RequestWithUser) {
    const requests = await this.joinRequestService.findByClinic(
      req.user!.clinicId!,
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
    const user = req.user!;
    const request = await this.joinRequestService.findById(requestId);

    if (!request || request.clinicId !== user.clinicId) {
      throw new NotFoundException('Request not found');
    }

    await this.joinRequestService.approve(
      requestId,
      user.id,
      user.name,
      dto.assignedRole,
      dto.welcomeMessage,
    );

    try {
      await this.staffNotificationService.notifyStaff({
        clinicId: user.clinicId!,
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
    const user = req.user!;
    const request = await this.joinRequestService.findById(requestId);

    if (!request || request.clinicId !== user.clinicId) {
      throw new NotFoundException('Request not found');
    }

    await this.joinRequestService.reject(
      requestId,
      user.id,
      user.name,
      dto.reason,
    );

    try {
      await this.staffNotificationService.notifyStaff({
        clinicId: user.clinicId!,
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
    await this.joinRequestService.withdraw(requestId, req.user!.id);

    return {
      success: true,
      message: 'Request withdrawn',
    };
  }
}
