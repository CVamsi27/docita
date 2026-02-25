import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentService } from '../../application/services/appointment.service';
import { AppointmentStatusEnum } from '../../core/value-objects/appointment-status.value-object';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '../../../../shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '../../../../shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '../../../../common/types/common.types';
import { CreateAppointmentDto } from '../../application/dto/appointments.dto';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class AppointmentsController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create new appointment' })
  async create(
    @Request() req: RequestWithUser,
    @Body() body: CreateAppointmentDto,
  ) {
    return this.appointmentService.createAppointment({
      ...body,
      clinicId: req.user!.clinicId!,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all appointments' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Request() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const statuses = status
      ? (status.split(',') as AppointmentStatusEnum[])
      : undefined;

    return this.appointmentService.listAppointments({
      clinicId: req.user!.clinicId!,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      patientId,
      doctorId,
      search,
      status: statuses,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string) {
    return this.appointmentService.getAppointment(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }
    return this.appointmentService.cancelAppointment(id, reason);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule appointment' })
  async reschedule(
    @Param('id') id: string,
    @Body() body: { startTime: string; endTime: string },
  ) {
    return this.appointmentService.rescheduleAppointment(
      id,
      new Date(body.startTime),
      new Date(body.endTime),
    );
  }
}
