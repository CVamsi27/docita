import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  Res,
  Query,
  UsePipes,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  IdempotencyInterceptor,
  RequiresIdempotency,
} from '@/shared/modules/idempotency';
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
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Specialization, HospitalRole } from '@workspace/db';
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
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';

@Controller('prescriptions')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PRESCRIPTIONS))
@UseInterceptors(IdempotencyInterceptor)
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
        'Prescription',
        { search, date, startDate, endDate, limit },
      );
    }

    return this.prescriptionsService.findAll(req.user!.clinicId!, {
      search,
      date,
      startDate,
      endDate,
      patientId,
      limit,
    });
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const prescription = await this.prescriptionsService.findOne(
      id,
      req.user!.clinicId!,
    );
    await logPatientPhiRead(
      this.auditService,
      req,
      prescription.patientId,
      'VIEW_HISTORY',
    );
    return prescription;
  }

  @Post()
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  @Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PRESCRIPTIONS, 'write'))
  @RequiresIdempotency()
  @ZodSerializerDto(PrescriptionResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionSchema))
  create(@Request() req: RequestWithUser, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create({
      ...dto,
      appointmentId: dto.appointmentId || '',
      doctorId: dto.doctorId || req.user!.id,
      doctorSpecialization: dto.doctorSpecialization as Specialization,
      doctorRole: dto.doctorRole as HospitalRole,
      clinicId: req.user!.clinicId!,
    });
  }

  @Get(':id/pdf/status')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  async getPdfStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('jobId') jobId: string,
  ) {
    const prescription = await this.prescriptionsService.findOne(
      id,
      req.user!.clinicId!,
    );
    await logPatientPhiRead(
      this.auditService,
      req,
      prescription.patientId,
      'VIEW_HISTORY',
    );
    return this.pdfJobService.getStatus(jobId, req.user!.clinicId!);
  }

  @Get(':id/pdf')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  async getPdf(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    const prescription = await this.prescriptionsService.findOne(
      id,
      req.user!.clinicId!,
    );
    await logPatientPhiRead(
      this.auditService,
      req,
      prescription.patientId,
      'VIEW_HISTORY',
    );

    if (isAsync === 'true') {
      const result = await this.prescriptionsService.generatePdfAsync(
        id,
        req.user!.clinicId!,
      );
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    const result = await this.prescriptionsService.getPdf(
      id,
      req.user!.clinicId!,
    );

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
