import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { PatientPortalService } from '@/domains/patient-portal/application/services/patient-portal.service';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { PatientTimelineService } from '@/domains/patients/application/services/patient-timeline.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { MedicationDoseService } from '@/domains/patients/application/services/medication-dose.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { PatientAppointmentRequestCreateDto } from '@/domains/appointments/application/dto/appointments.dto';

@ApiTags('patient-portal')
@Controller('patient-portal')
@UseGuards(JwtAuthGuard)
@Roles(Role.PATIENT)
@SkipSubscriptionCheck()
@ApiBearerAuth('JWT-auth')
export class PatientPortalController {
  constructor(
    private readonly portalService: PatientPortalService,
    private readonly contextService: PatientPortalContextService,
    private readonly timelineService: PatientTimelineService,
    private readonly medicationDoseService: MedicationDoseService,
    private readonly appointmentRequestService: AppointmentRequestService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient portal dashboard' })
  async getDashboard(@Request() req: RequestWithUser) {
    return this.portalService.getDashboard(req.user!.id);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List patient appointments' })
  async getAppointments(
    @Request() req: RequestWithUser,
    @Query()
    query: {
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.portalService.getAppointments(req.user!.id, {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get appointment detail' })
  async getAppointmentById(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.portalService.getAppointmentById(req.user!.id, id);
  }

  @Post('appointments/request')
  @ApiOperation({ summary: 'Request a new appointment' })
  async requestAppointment(
    @Request() req: RequestWithUser,
    @Body() body: PatientAppointmentRequestCreateDto,
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.appointmentRequestService.createPatientRequest(
      patientId,
      clinicId,
      body,
    );
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'List patient prescriptions' })
  async getPrescriptions(
    @Request() req: RequestWithUser,
    @Query() query: { limit?: string; offset?: string },
  ) {
    return this.portalService.getPrescriptions(req.user!.id, {
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get prescription detail' })
  async getPrescriptionById(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.portalService.getPrescriptionById(req.user!.id, id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List patient invoices' })
  async getInvoices(
    @Request() req: RequestWithUser,
    @Query() query: { status?: string; limit?: string; offset?: string },
  ) {
    return this.portalService.getInvoices(req.user!.id, {
      status: query.status,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get patient profile' })
  async getProfile(@Request() req: RequestWithUser) {
    return this.portalService.getProfile(req.user!.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update patient profile' })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      phoneNumber?: string;
      email?: string;
      address?: string;
      whatsappConsent?: boolean;
      preferredName?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    },
  ) {
    return this.portalService.updateProfile(req.user!.id, body);
  }

  @Get('consent')
  @ApiOperation({ summary: 'Get consent settings' })
  async getConsent(@Request() req: RequestWithUser) {
    return this.portalService.getConsent(req.user!.id);
  }

  @Patch('consent')
  @ApiOperation({ summary: 'Update consent settings' })
  async updateConsent(
    @Request() req: RequestWithUser,
    @Body() body: { whatsappConsent?: boolean; dataStorageConsent?: boolean },
  ) {
    return this.portalService.updateConsent(req.user!.id, body);
  }

  @Post('profile/delete-request')
  @ApiOperation({ summary: 'Request patient data deletion' })
  async requestDataDeletion(
    @Request() req: RequestWithUser,
    @Body() body: { reason: string; confirmDeletion?: boolean },
  ) {
    return this.portalService.requestDataDeletion(req.user!.id, body);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get unified patient timeline' })
  async getTimeline(
    @Request() req: RequestWithUser,
    @Query()
    query: {
      eventTypes?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    const eventTypes = query.eventTypes
      ? (query.eventTypes.split(',') as Parameters<
          typeof this.timelineService.getTimeline
        >[2]['eventTypes'])
      : undefined;
    return this.timelineService.getTimeline(clinicId, patientId, {
      eventTypes,
      from: query.from,
      to: query.to,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('timeline/snapshot')
  @ApiOperation({ summary: 'Get patient clinical snapshot' })
  async getSnapshot(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.timelineService.getPatientSnapshot(clinicId, patientId);
  }

  @Get('medications/active')
  @ApiOperation({ summary: 'Get active medications' })
  async getActiveMedications(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.medicationDoseService.getActiveMedications(clinicId, patientId);
  }

  @Get('medications/doses')
  @ApiOperation({ summary: 'Get medication dose history' })
  async getDoseHistory(
    @Request() req: RequestWithUser,
    @Query()
    query: {
      prescriptionId?: string;
      from?: string;
      to?: string;
      status?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.medicationDoseService.getDoseHistory(clinicId, patientId, {
      prescriptionId: query.prescriptionId,
      from: query.from,
      to: query.to,
      status: query.status as Parameters<
        typeof this.medicationDoseService.getDoseHistory
      >[2]['status'],
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Post('medications/doses')
  @ApiOperation({ summary: 'Patient self-report a dose' })
  async recordDose(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      medicationId: string;
      takenAt?: string;
      status: 'TAKEN' | 'MISSED' | 'SKIPPED';
      doseAmount?: string;
      notes?: string;
    },
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.medicationDoseService.recordAdHocDose(
      clinicId,
      patientId,
      {
        medicationId: body.medicationId,
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        doseAmount: body.doseAmount,
        notes: body.notes,
      },
      'PATIENT_REPORTED',
    );
  }

  @Get('medications/adherence')
  @ApiOperation({ summary: 'Get medication adherence summary' })
  async getAdherence(
    @Request() req: RequestWithUser,
    @Query() query: { prescriptionId?: string },
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      req.user!.id,
    );
    return this.medicationDoseService.getAdherenceSummary(
      clinicId,
      patientId,
      query.prescriptionId,
    );
  }
}
