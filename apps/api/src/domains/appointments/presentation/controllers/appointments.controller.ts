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
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import {
  CreateAppointmentDto,
  CancelAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
  VitalsDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import {
  appointmentDomainCreateSchema,
  appointmentRescheduleRequestSchema,
} from '@workspace/types';

const parseAppointmentStatus = (
  status: string,
): AppointmentStatusEnum | undefined => {
  switch (status.trim().toLowerCase()) {
    case 'scheduled':
      return AppointmentStatusEnum.SCHEDULED;
    case 'confirmed':
      return AppointmentStatusEnum.CONFIRMED;
    case 'arrived':
    case 'checked-in':
      return AppointmentStatusEnum.ARRIVED;
    case 'in_progress':
    case 'in-progress':
      return AppointmentStatusEnum.IN_PROGRESS;
    case 'completed':
      return AppointmentStatusEnum.COMPLETED;
    case 'cancelled':
      return AppointmentStatusEnum.CANCELLED;
    case 'noshow':
    case 'no-show':
      return AppointmentStatusEnum.NOSHOW;
    default:
      return undefined;
  }
};

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
    const payload = appointmentDomainCreateSchema.parse({
      ...body,
      clinicId: req.user!.clinicId!,
    });

    return this.appointmentService.createAppointment(payload);
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
    @Query() query: ListAppointmentsQueryDto,
  ) {
    const {
      date,
      startDate,
      endDate,
      patientId,
      doctorId,
      search,
      status,
      cursor,
      limit,
    } = query;

    const effectiveStartDate = startDate ?? date;
    const effectiveEndDate =
      endDate ?? (date ? `${date}T23:59:59.999Z` : undefined);

    const statuses = status
      ?.split(',')
      .map(parseAppointmentStatus)
      .filter((value): value is AppointmentStatusEnum => value !== undefined);

    return this.appointmentService.listAppointments({
      clinicId: req.user!.clinicId!,
      startDate: effectiveStartDate ? new Date(effectiveStartDate) : undefined,
      endDate: effectiveEndDate ? new Date(effectiveEndDate) : undefined,
      patientId,
      doctorId,
      search,
      status: statuses,
      cursor,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string) {
    return this.appointmentService.getAppointment(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment details' })
  async update(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateAppointmentDto,
  ) {
    return this.appointmentService.updateAppointmentDetails(
      id,
      req.user!.clinicId!,
      body as never,
    );
  }

  @Post(':id/vitals')
  @ApiOperation({ summary: 'Create or update appointment vitals' })
  async createVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    return this.appointmentService.createVitals(
      id,
      req.user!.clinicId!,
      body as never,
    );
  }

  @Patch(':id/vitals')
  @ApiOperation({ summary: 'Patch appointment vitals' })
  async updateVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    return this.appointmentService.updateVitals(
      id,
      req.user!.clinicId!,
      body as never,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(@Param('id') id: string, @Body() body: CancelAppointmentDto) {
    const reason = body.reason;
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }
    return this.appointmentService.cancelAppointment(id, reason);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule appointment' })
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleAppointmentDto,
  ) {
    const payload = appointmentRescheduleRequestSchema.parse(body);
    return this.appointmentService.rescheduleAppointment(
      id,
      payload.startTime,
      payload.endTime,
    );
  }
}
