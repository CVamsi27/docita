import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoices.dto';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('invoices')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.INVOICING)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.findAll(req.user.clinicId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      patientId,
      status,
      date,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create({
      ...dto,
      clinicId: req.user.clinicId,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Get(':id/pdf')
  async generatePDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.invoicesService.generatePDF(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`,
    );
    res.send(pdfBuffer);
  }
}
