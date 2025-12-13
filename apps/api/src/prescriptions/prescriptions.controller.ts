import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import type { Medication } from '@workspace/types';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

interface CreatePrescriptionDto {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  instructions?: string;
  medications: Medication[];
  // Doctor context for audit trail (Phase 5)
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: string;
  doctorRole?: string;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
}

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.prescriptionsService.findAll(req.user.clinicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Post()
  create(
    @Request() req: AuthRequest,
    @Body() createPrescriptionDto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create({
      ...createPrescriptionDto,
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.prescriptionsService.generatePDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=prescription-${id}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
