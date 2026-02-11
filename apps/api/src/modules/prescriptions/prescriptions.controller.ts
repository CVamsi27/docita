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
} from '@nestjs/common';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';

import {
  CreatePrescriptionDto,
  PrescriptionResponseDto,
  PrescriptionListResponseDto,
} from './dto/prescriptions.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('prescriptions')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ZodSerializerDto(PrescriptionListResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
    @Query('date') date?: string,
  ) {
    return this.prescriptionsService.findAll(req.user.clinicId, {
      search,
      date,
    });
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionResponseDto)
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Post()
  @RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
  @ZodSerializerDto(PrescriptionResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create({
      ...dto,
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
