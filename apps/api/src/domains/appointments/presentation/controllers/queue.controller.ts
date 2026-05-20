import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { QueueService } from '@/domains/appointments/application/services/queue.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  APP_ACCESS_TARGETS,
  resolveDoctorScopedAppointmentFilter,
} from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logClinicPhiListRead } from '@/shared/modules/audit/audit/patient-access-audit.util';

@ApiTags('Queue')
@Controller('queue')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_QUEUE))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_QUEUE))
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get active queue (WAITING + IN_PROGRESS) for today',
  })
  async getQueue(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    const doctorScope = resolveDoctorScopedAppointmentFilter({
      role: req.user?.role,
      userId: req.user?.id,
      requestedDoctorId: doctorId,
    });

    if (doctorScope.denied) {
      throw new ForbiddenException('Doctors can only access their queue');
    }

    await logClinicPhiListRead(
      this.auditService,
      req,
      'VIEW_APPOINTMENT_LIST',
      'Appointment',
      { scope: 'queue', doctorId: doctorScope.scopedDoctorId, search },
    );

    return this.queueService.getQueue(
      req.user!.clinicId!,
      doctorScope.scopedDoctorId,
      search,
    );
  }

  @Get('today')
  @ApiOperation({ summary: 'Get full queue for today with stats' })
  async getTodayQueue(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    const doctorScope = resolveDoctorScopedAppointmentFilter({
      role: req.user?.role,
      userId: req.user?.id,
      requestedDoctorId: doctorId,
    });

    if (doctorScope.denied) {
      throw new ForbiddenException('Doctors can only access their queue');
    }

    await logClinicPhiListRead(
      this.auditService,
      req,
      'VIEW_APPOINTMENT_LIST',
      'Appointment',
      { scope: 'queue-today', doctorId: doctorScope.scopedDoctorId, search },
    );

    return this.queueService.getTodayQueue(
      req.user!.clinicId!,
      doctorScope.scopedDoctorId,
      search,
    );
  }

  @Post('check-in/:appointmentId')
  @ApiOperation({ summary: 'Check in a patient by appointment ID' })
  checkIn(
    @Request() req: RequestWithUser,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.queueService.checkIn(req.user!.clinicId!, appointmentId);
  }

  @Post('call/:queueId')
  @ApiOperation({ summary: 'Call a patient (set IN_PROGRESS)' })
  callPatient(
    @Request() req: RequestWithUser,
    @Param('queueId') queueId: string,
  ) {
    return this.queueService.callPatient(req.user!.clinicId!, queueId);
  }

  @Post('complete/:queueId')
  @ApiOperation({ summary: 'Mark a patient as completed' })
  completePatient(
    @Request() req: RequestWithUser,
    @Param('queueId') queueId: string,
  ) {
    return this.queueService.completePatient(req.user!.clinicId!, queueId);
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Reset queue (cancel all WAITING and IN_PROGRESS tokens)',
  })
  resetQueue(@Request() req: RequestWithUser) {
    return this.queueService.resetQueue(req.user!.clinicId!);
  }
}
