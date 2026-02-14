import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Put,
  UsePipes,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  VitalsDto,
  AppointmentResponseDto,
  PaginatedAppointmentResponseDto,
  VitalSignResponseDto,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  VitalsSchema,
} from './dto/appointments.dto';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { CacheDuration } from '../../common/interceptors/cache.interceptor';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @CacheDuration('no-cache')
  @ApiOperation({ summary: 'List all appointments' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by patient name or doctor',
  })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ZodSerializerDto(PaginatedAppointmentResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentsService.findAll(req.user.clinicId, {
      date,
      startDate,
      endDate,
      patientId,
      doctorId,
      search,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @Get(':id')
  @ZodSerializerDto(AppointmentResponseDto)
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @ZodSerializerDto(AppointmentResponseDto)
  @UsePipes(new ZodValidationPipe(CreateAppointmentSchema))
  create(
    @Request() req: AuthRequest,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create({
      ...createAppointmentDto,
      clinicId: createAppointmentDto.clinicId || req.user.clinicId,
    });
  }

  @Patch(':id')
  @ZodSerializerDto(AppointmentResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateAppointmentSchema))
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @Request() req: AuthRequest,
  ) {
    return this.appointmentsService.update(
      id,
      updateAppointmentDto,
      req.user.clinicId,
    );
  }

  @Put(':id')
  @ZodSerializerDto(AppointmentResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateAppointmentSchema))
  updateWithPut(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @Request() req: AuthRequest,
  ) {
    return this.appointmentsService.update(
      id,
      updateAppointmentDto,
      req.user.clinicId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }

  @Post(':id/vitals')
  @ZodSerializerDto(VitalSignResponseDto)
  @UsePipes(new ZodValidationPipe(VitalsSchema))
  createVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.createVitals(id, vitalsDto);
  }

  @Put(':id/vitals')
  @ZodSerializerDto(VitalSignResponseDto)
  @UsePipes(new ZodValidationPipe(VitalsSchema))
  updateVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.updateVitals(id, vitalsDto);
  }
}
