import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  UseGuards,
  Request,
  Query,
  Put,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  appointmentSchema,
  GeneralExamination,
  SystemicExamination,
  ClinicalInvestigation,
  AppointmentPriority,
} from '@workspace/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

// Create schema for API input - clinicId is optional as it's added from auth
const createAppointmentApiSchema = appointmentSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    patient: true,
    doctor: true,
    vitalSign: true,
    prescription: true,
    invoice: true,
    diagnoses: true,
    procedures: true,
  })
  .extend({
    clinicId: appointmentSchema.shape.clinicId.optional(),
  });

type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no-show'
  | 'in-progress';
type AppointmentType =
  | 'consultation'
  | 'follow-up'
  | 'check-up'
  | 'emergency'
  | 'procedure';

interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  clinicId?: string;
  startTime: string | Date;
  endTime: string | Date;
  status: AppointmentStatus;
  type: AppointmentType;
  priority?: AppointmentPriority;
  notes?: string;
  observations?: string;
}
type UpdateAppointmentDto = Partial<CreateAppointmentDto> & {
  // Clinical Documentation - Subjective
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  reviewOfSystems?: string;
  // Clinical Documentation - Objective
  generalExamination?: GeneralExamination;
  systemicExamination?: SystemicExamination;
  // Clinical Documentation - Assessment
  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;
  clinicalImpression?: string;
  // Clinical Documentation - Plan
  investigations?: ClinicalInvestigation[];
  finalDiagnosis?: string;
  treatmentPlan?: string;
  followUpPlan?: string;
};

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

interface VitalsDto {
  height?: number;
  weight?: number;
  bmi?: number;
  bloodPressure?: string;
  pulse?: number;
  respiratoryRate?: number;
  temperature?: number;
  spo2?: number;
  painScore?: number;
  bloodGlucose?: number;
  notes?: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('patientId') patientId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentsService.findAll(req.user.clinicId, {
      date,
      startDate,
      endDate,
      patientId,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createAppointmentApiSchema))
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
  createVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.createVitals(id, vitalsDto);
  }

  @Put(':id/vitals')
  updateVitals(@Param('id') id: string, @Body() vitalsDto: VitalsDto) {
    return this.appointmentsService.updateVitals(id, vitalsDto);
  }
}
