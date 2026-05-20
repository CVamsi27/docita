import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { ZodSerializerDto } from 'nestjs-zod';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { parseAppointmentStatus } from '@/domains/appointments/application/mappers/appointment-status.mapper';
import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import {
  listAppointmentsResponseSchema,
  appointmentDomainCreateSchema,
  appointmentRescheduleRequestSchema,
  resolveDoctorScopedAppointmentFilter,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  CreateAppointmentDto,
  CancelAppointmentDto,
  ListAppointmentsQueryDto,
  PaginatedAppointmentResponseDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import {
  AppointmentsApiAccess,
  getAppointmentAccessContext,
} from '@/domains/appointments/presentation/controllers/appointments.controller.access';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';

@ApiTags('appointments')
@Controller('appointments')
@AppointmentsApiAccess()
export class AppointmentsScheduleController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequiresIdempotency()
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
  @ZodSerializerDto(PaginatedAppointmentResponseDto)
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

    if (patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        patientId,
        'VIEW_HISTORY',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_APPOINTMENT_LIST',
        'Appointment',
        {
          startDate,
          endDate,
          doctorId: doctorScope.scopedDoctorId,
          search,
          status,
          cursor,
          limit,
        },
      );
    }

    const result = await this.appointmentService.listAppointments({
      clinicId: req.user!.clinicId!,
      calendarPickerDate: date,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      patientId,
      doctorId: doctorScope.scopedDoctorId,
      search,
      status: statuses,
      cursor,
      limit,
    });

    return listAppointmentsResponseSchema.parse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const appointment = await this.appointmentService.getAppointment(
      id,
      req.user!.clinicId!,
      getAppointmentAccessContext(req),
    );
    await logPatientPhiRead(
      this.auditService,
      req,
      appointment.patientId,
      'VIEW_HISTORY',
    );
    return appointment;
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
      getAppointmentAccessContext(req),
    );
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
      getAppointmentAccessContext(req),
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
      getAppointmentAccessContext(req),
    );
  }
}
