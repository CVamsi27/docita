import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  Query,
  UsePipes,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import type { Response } from 'express';
import { PrescriptionsService } from '@/domains/prescriptions/application/services/prescription.service';
import {
  PdfJobService,
  type PdfJobServicePort,
} from '@/shared/modules/queue/pdf-job.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { APP_ACCESS_TARGETS, hospitalRoleSchema } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { Specialization } from '@workspace/db';
import {
  CreatePrescriptionDto,
  ListPrescriptionsQueryDto,
  PrescriptionResponseDto,
  PrescriptionListResponseDto,
  CreatePrescriptionSchema,
} from '@/domains/prescriptions/application/dto/prescription.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { setPrivateNoStoreHeaders } from '@/shared/common/http/private-download-response';

@Controller('prescriptions')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PRESCRIPTIONS))
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ZodSerializerDto(PrescriptionListResponseDto)
  async findAll(
    @Request() req: RequestWithUser,
    @Query() query?: ListPrescriptionsQueryDto,
  ) {
// jscpd:ignore-start
    const { search, date, startDate, endDate, patientId, limit } = query ?? {};

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
        'VIEW_PRESCRIPTION_LIST',
// jscpd:ignore-end
        'Prescription',
        { search, date, startDate, endDate, limit },
      );
    }

    const { clinicId } = getClinicStaffRequestContext(req);
    return this.prescriptionsService.findAll(clinicId, {
      search,
      date,
      startDate,
      endDate,
      patientId,
      limit,
    });
  }

  /**
   * Shared by `findOne`, `getPdfStatus`, and `getPdf` — all three load the
   * prescription and record the same PHI-read audit entry before doing
   * their endpoint-specific work, so keeping the fetch+audit pairing here
   * stops the trio's audit reason/action from drifting apart.
   */
  private async loadPrescriptionWithPhiAudit(
    req: RequestWithUser,
    id: string,
    clinicId: string,
  ) {
    const prescription = await this.prescriptionsService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      prescription.patientId,
      'VIEW_HISTORY',
    );
    return prescription;
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.loadPrescriptionWithPhiAudit(req, id, clinicId);
  }

  @Post()
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PRESCRIPTIONS, 'write'))
  @RequiresIdempotency()
  @ZodSerializerDto(PrescriptionResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionSchema))
  create(@Request() req: RequestWithUser, @Body() dto: CreatePrescriptionDto) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.prescriptionsService.create({
      ...dto,
      appointmentId: dto.appointmentId || '',
      doctorId: dto.doctorId || userId,
      doctorSpecialization: dto.doctorSpecialization
        ? (parseStringEnumMember(
            Object.values(Specialization),
            dto.doctorSpecialization,
          ) ?? undefined)
        : undefined,
      doctorRole: dto.doctorRole
        ? (parseStringEnumMember(hospitalRoleSchema.options, dto.doctorRole) ??
          undefined)
        : undefined,
      clinicId,
    });
  }

  @Get(':id/pdf/status')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  async getPdfStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    setPrivateNoStoreHeaders(res);
    const { clinicId } = getClinicStaffRequestContext(req);
    await this.loadPrescriptionWithPhiAudit(req, id, clinicId);
    return this.pdfJobService.getStatus(jobId, clinicId);
  }

  @Get(':id/pdf')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  async getPdf(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    setPrivateNoStoreHeaders(res);
    const { clinicId } = getClinicStaffRequestContext(req);
    await this.loadPrescriptionWithPhiAudit(req, id, clinicId);

    if (isAsync === 'true') {
      const result = await this.prescriptionsService.generatePdfAsync(
        id,
        clinicId,
      );
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    const result = await this.prescriptionsService.getPdf(id, clinicId);

    if (result.type === 'url') {
      return res.json({ url: result.url });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=prescription-${id}.pdf`,
      'Content-Length': result.buffer.length,
    });
    res.end(result.buffer);
  }
}
