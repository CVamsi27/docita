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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  VitalsDto,
  AppointmentResponseDto,
  PaginatedAppointmentResponseDto,
  VitalSignResponseDto,
} from './dto/appointments.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { CacheDuration } from '../common/interceptors/cache.interceptor';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @CacheDuration('no-cache')
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
  createVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.createVitals(id, vitalsDto);
  }

  @Put(':id/vitals')
  @ZodSerializerDto(VitalSignResponseDto)
  updateVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.updateVitals(id, vitalsDto);
  }
}
