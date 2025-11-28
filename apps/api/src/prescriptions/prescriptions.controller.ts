/* eslint-disable */
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

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) { }

  @Get()
  findAll() {
    return this.prescriptionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Post()
  create(@Body() createPrescriptionDto: any) {
    return this.prescriptionsService.create(createPrescriptionDto);
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
