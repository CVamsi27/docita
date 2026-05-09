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
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('prescriptions')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PRESCRIPTIONS))
@UseInterceptors(IdempotencyInterceptor)
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
  ) {}

  @Get()
  @ZodSerializerDto(PrescriptionListResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query() query?: ListPrescriptionsQueryDto,
  ) {
    const { search, date, startDate, endDate, patientId, limit } = query ?? {};
    return this.prescriptionsService.findAll(req.user.clinicId, {
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
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.prescriptionsService.findOne(id, req.user.clinicId);
  }

  @Post()
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  @RequiresIdempotency()
  @ZodSerializerDto(PrescriptionResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionSchema))
  create(@Request() req: AuthRequest, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create({
      ...dto,
      appointmentId: dto.appointmentId || '',
      doctorId: dto.doctorId || req.user.id,
      doctorSpecialization: dto.doctorSpecialization as Specialization,
      doctorRole: dto.doctorRole as HospitalRole,
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id/pdf/status')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  getPdfStatus(@Request() req: AuthRequest, @Query('jobId') jobId: string) {
    return this.pdfJobService.getStatus(jobId, req.user.clinicId);
  }

  @Get(':id/pdf')
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  async getPdf(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    if (isAsync === 'true') {
      const result = await this.prescriptionsService.generatePdfAsync(
        id,
        req.user.clinicId,
      );
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    const result = await this.prescriptionsService.getPdf(
      id,
      req.user.clinicId,
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
