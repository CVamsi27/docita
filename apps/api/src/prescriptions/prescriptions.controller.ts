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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

import { CreatePrescriptionDto } from './dto/prescriptions.dto';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
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
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Post()
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
