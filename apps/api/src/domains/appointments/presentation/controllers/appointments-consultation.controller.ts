import { Controller, Post, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import {
  AppointmentsApiAccess,
  getAppointmentAccessContext,
} from '@/domains/appointments/presentation/controllers/appointments.controller.access';

@ApiTags('appointments')
@Controller('appointments')
@AppointmentsApiAccess()
export class AppointmentsConsultationController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post(':id/start-consultation')
  @Roles(Role.DOCTOR, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Start a consultation for the assigned doctor' })
  async startConsultation(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.appointmentService.startConsultation(
      id,
      requireClinicIdFromRequest(req),
      getAppointmentAccessContext(req),
    );
  }
}
