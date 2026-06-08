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
import { PatientsPrescriptionsApiAccess } from '@/domains/patients/presentation/controllers/patients.controller.access';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { MedicationDoseService } from '@/domains/patients/application/services/medication-dose.service';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import {
  medicationDoseStatusSchema,
  type MedicationDoseStatus,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';

const MEDICATION_DOSE_STATUSES = medicationDoseStatusSchema.options;

function parseMedicationDoseStatus(
  status: string | undefined,
): MedicationDoseStatus | undefined {
  if (!status) return undefined;
  return parseStringEnumMember(MEDICATION_DOSE_STATUSES, status) ?? undefined;
}
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';

@ApiTags('medication-doses')
@Controller('patients/:patientId/medication-doses')
@PatientsPrescriptionsApiAccess()
@ApiBearerAuth('JWT-auth')
export class MedicationDoseController {
  constructor(
    private readonly medicationDoseService: MedicationDoseService,
    private readonly patientService: PatientService,
    private readonly auditService: AuditService,
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
      status: parseMedicationDoseStatus(body.status),
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
      version?: number;
    },
  ) {
    const clinicId = await this.getClinicId(req);
    return this.medicationDoseService.updateDoseStatus(
      clinicId,
      patientId,
      doseId,
      {
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        status: parseMedicationDoseStatus(body.status),
        notes: body.notes,
        version: body.version,
      },
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get medication dose history' })
  async getDoseHistory(
    // jscpd:ignore-start
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
    // jscpd:ignore-end
    return this.medicationDoseService.getDoseHistory(clinicId, patientId, {
      prescriptionId: query.prescriptionId,
      from: query.from,
      to: query.to,
      status: parseMedicationDoseStatus(query.status),
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
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');
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
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');
    return this.medicationDoseService.getActiveMedications(clinicId, patientId);
  }
}
