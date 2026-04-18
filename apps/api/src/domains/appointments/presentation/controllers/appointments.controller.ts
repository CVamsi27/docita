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
  ForbiddenException,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe, ZodSerializerDto } from 'nestjs-zod';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  APP_ACCESS_TARGETS,
  diagnosesSyncRequestSchema,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/common/types/common.types';
import {
  CreateAppointmentDto,
  CancelAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
  VitalsDto,
  DiagnosesSyncDto,
  DiagnosesSyncResponseDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import {
  appointmentDomainCreateSchema,
  appointmentRescheduleRequestSchema,
  resolveDoctorScopedAppointmentFilter,
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
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class AppointmentsController {
  constructor(private readonly appointmentService: AppointmentService) {}

  private getAccessContext(req: RequestWithUser): {
    role?: Role;
    userId?: string;
  } {
    return {
      role: req.user?.role,
      userId: req.user?.id,
    };
  }

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

    const doctorScope = resolveDoctorScopedAppointmentFilter({
      role: req.user?.role,
      userId: req.user?.id,
      requestedDoctorId: doctorId,
    });
    if (doctorScope.denied) {
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );
    }

    return this.appointmentService.listAppointments({
      clinicId: req.user!.clinicId!,
      startDate: effectiveStartDate ? new Date(effectiveStartDate) : undefined,
      endDate: effectiveEndDate ? new Date(effectiveEndDate) : undefined,
      patientId,
      doctorId: doctorScope.scopedDoctorId,
      search,
      status: statuses,
      cursor,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.appointmentService.getAppointment(
      id,
      req.user!.clinicId!,
      this.getAccessContext(req),
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Update appointment details' })
  async update(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateAppointmentDto,
  ) {
    return this.appointmentService.updateAppointmentDetails(
      id,
      req.user!.clinicId!,
      body,
      this.getAccessContext(req),
    );
  }

  @Post(':id/start-consultation')
  @Roles(Role.DOCTOR, Role.ADMIN_DOCTOR)
  @ApiOperation({ summary: 'Start a consultation for the assigned doctor' })
  async startConsultation(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.appointmentService.startConsultation(
      id,
      req.user!.clinicId!,
      this.getAccessContext(req),
    );
  }

  @Post(':id/vitals')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
  @ApiOperation({ summary: 'Create or update appointment vitals' })
  @ZodSerializerDto(VitalsDto)
  async createVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    const {
      id: _id,
      appointmentId: _appointmentId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...vitals
    } = body;
    return this.appointmentService.createVitals(
      id,
      req.user!.clinicId!,
      vitals,
      this.getAccessContext(req),
    );
  }

  @Patch(':id/vitals')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
  @ApiOperation({ summary: 'Patch appointment vitals' })
  @ZodSerializerDto(VitalsDto)
  async updateVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    const {
      id: _id,
      appointmentId: _appointmentId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...vitals
    } = body;
    return this.appointmentService.updateVitals(
      id,
      req.user!.clinicId!,
      vitals,
      this.getAccessContext(req),
    );
  }

  @Post(':id/diagnoses')
  @ApiOperation({ summary: 'Sync ICD-10 diagnoses for an appointment' })
  @UsePipes(new ZodValidationPipe(diagnosesSyncRequestSchema))
  @ZodSerializerDto(DiagnosesSyncResponseDto)
  async syncDiagnoses(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: DiagnosesSyncDto,
  ): Promise<DiagnosesSyncResponseDto> {
    const result = await this.appointmentService.syncDiagnoses(
      id,
      req.user!.clinicId!,
      body.diagnoses ?? [],
      body.contentHash,
    );
    return {
      success: true,
      contentHash: result.contentHash,
      skipped: result.skipped,
      count: result.count,
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: CancelAppointmentDto,
  ) {
    const reason = body.reason;
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }
    return this.appointmentService.cancelAppointment(
      id,
      reason,
      req.user!.clinicId!,
      this.getAccessContext(req),
    );
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule appointment' })
  async reschedule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: RescheduleAppointmentDto,
  ) {
    const payload = appointmentRescheduleRequestSchema.parse(body);
    return this.appointmentService.rescheduleAppointment(
      id,
      payload.startTime,
      payload.endTime,
      req.user!.clinicId!,
      this.getAccessContext(req),
    );
  }
}
