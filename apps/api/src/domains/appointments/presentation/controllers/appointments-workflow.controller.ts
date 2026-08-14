import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { RequirePolicy } from '@/shared/modules/auth/decorators/require-policy.decorator';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { appointmentRescheduleRequestSchema } from '@workspace/types';
import { coerceAppointmentBoundaryInstant } from '@/domains/appointments/application/mappers/appointment-instant.mapper';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import {
  CancelAppointmentDto,
  RescheduleAppointmentDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import {
  AppointmentsApiAccess,
  getAppointmentAccessContext,
} from '@/domains/appointments/presentation/controllers/appointments.controller.access';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('appointments')
@Controller('appointments')
@AppointmentsApiAccess()
export class AppointmentsWorkflowController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Patch(':id/cancel')
  @RequirePolicy('appointment', 'update')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: CancelAppointmentDto,
  ) {
    const reason = body.reason;
    if (!reason)
      throw new BadRequestException('Cancellation reason is required');
    return this.appointmentService.cancelAppointment(
      id,
      reason,
      requireClinicIdFromRequest(req),
      getAppointmentAccessContext(req),
    );
  }

  @Patch(':id/reschedule')
  @RequirePolicy('appointment', 'update')
  @RequiresIdempotency()
  @ApiOperation({ summary: 'Reschedule appointment' })
  async reschedule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: RescheduleAppointmentDto,
  ) {
    const clinicId = requireClinicIdFromRequest(req);
    const timezone = await this.appointmentService.getClinicTimezone(clinicId);
    const parsed = appointmentRescheduleRequestSchema.parse(body);
    return this.appointmentService.rescheduleAppointment(
      id,
      coerceAppointmentBoundaryInstant(
        parsed.startTime,
        timezone,
        'start time',
      ),
      coerceAppointmentBoundaryInstant(parsed.endTime, timezone, 'end time'),
      clinicId,
      getAppointmentAccessContext(req),
    );
  }
}
