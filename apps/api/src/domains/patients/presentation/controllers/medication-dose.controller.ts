import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Feature } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { MedicationDoseService } from '@/domains/patients/application/services/medication-dose.service';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { parsePaginationInt } from '@/common/utils/string.utils';

@ApiTags('medication-doses')
@Controller('patients/:patientId/medication-doses')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
@ApiBearerAuth('JWT-auth')
export class MedicationDoseController {
  constructor(
    private readonly medicationDoseService: MedicationDoseService,
    private readonly patientService: PatientService,
  ) {}

  private async getClinicId(req: RequestWithUser): Promise<string> {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new NotFoundException('Clinic context required');
    return clinicId;
  }

  @Post()
  @ApiOperation({ summary: 'Record a scheduled medication dose' })
  async recordDose(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body()
    body: {
      medicationId: string;
      scheduledAt: string;
      status?: string;
      doseAmount?: string;
      notes?: string;
      prescriptionId?: string;
    },
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.recordDose(clinicId, patientId, {
      medicationId: body.medicationId,
      scheduledAt: new Date(body.scheduledAt),
      status: body.status as Parameters<
        typeof this.medicationDoseService.recordDose
      >[2]['status'],
      doseAmount: body.doseAmount,
      notes: body.notes,
      prescriptionId: body.prescriptionId,
    });
  }

  @Post('ad-hoc')
  @ApiOperation({ summary: 'Record an ad-hoc PRN dose' })
  async recordAdHocDose(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body()
    body: {
      medicationId: string;
      takenAt?: string;
      doseAmount?: string;
      notes?: string;
      prescriptionId?: string;
    },
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.recordAdHocDose(
      clinicId,
      patientId,
      {
        medicationId: body.medicationId,
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        doseAmount: body.doseAmount,
        notes: body.notes,
        prescriptionId: body.prescriptionId,
      },
      'CLINICIAN_RECORDED',
    );
  }

  @Patch(':doseId')
  @ApiOperation({ summary: 'Update dose status' })
  async updateDoseStatus(
    @Param('patientId') patientId: string,
    @Param('doseId') doseId: string,
    @Request() req: RequestWithUser,
    @Body()
    body: {
      takenAt?: string;
      status?: string;
      notes?: string;
    },
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.updateDoseStatus(
      clinicId,
      patientId,
      doseId,
      {
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        status: body.status as Parameters<
          typeof this.medicationDoseService.updateDoseStatus
        >[3]['status'],
        notes: body.notes,
      },
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get medication dose history' })
  async getDoseHistory(
    @Param('patientId') patientId: string,
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
    const clinicId = await this.getClinicId(req);
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

  @Get('adherence')
  @ApiOperation({ summary: 'Get medication adherence summary' })
  async getAdherence(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Query() query: { prescriptionId?: string },
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.getAdherenceSummary(
      clinicId,
      patientId,
      query.prescriptionId,
    );
  }

  @Get('active-medications')
  @ApiOperation({ summary: 'Get active medications with adherence' })
  async getActiveMedications(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.getActiveMedications(clinicId, patientId);
  }
}
