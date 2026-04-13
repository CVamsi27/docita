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
} from '@nestjs/common';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  Prisma,
  Role,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { APP_ACCESS_TARGETS } from '@workspace/types';
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

const mapAppointmentStatusToPrisma = (
  status: string | undefined,
): PrismaAppointmentStatus | undefined => {
  switch (status) {
    case 'scheduled':
      return PrismaAppointmentStatus.SCHEDULED;
    case 'confirmed':
    case 'checked-in':
      return PrismaAppointmentStatus.CONFIRMED;
    case 'in-progress':
      return PrismaAppointmentStatus.IN_PROGRESS;
    case 'completed':
      return PrismaAppointmentStatus.COMPLETED;
    case 'cancelled':
      return PrismaAppointmentStatus.CANCELLED;
    case 'no-show':
      return PrismaAppointmentStatus.NO_SHOW;
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
  @ApiOperation({ summary: 'Update appointment details' })
  async update(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: UpdateAppointmentDto,
  ) {
    const { status, ...rest } = body;
    const data: Prisma.AppointmentUpdateInput = {
      ...rest,
      ...(status ? { status: mapAppointmentStatusToPrisma(status) } : {}),
    };
    return this.appointmentService.updateAppointmentDetails(
      id,
      req.user!.clinicId!,
      data,
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
  @ApiOperation({ summary: 'Create or update appointment vitals' })
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
  @ApiOperation({ summary: 'Patch appointment vitals' })
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
  async syncDiagnoses(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body()
    body: {
      diagnoses: Array<{
        icdCodeId?: string;
        notes?: string;
        isPrimary?: boolean;
      }>;
    },
  ) {
    await this.appointmentService.syncDiagnoses(
      id,
      req.user!.clinicId!,
      body.diagnoses ?? [],
    );
    return { success: true };
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
