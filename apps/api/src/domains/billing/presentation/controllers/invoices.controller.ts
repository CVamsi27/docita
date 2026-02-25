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
import { InvoicesService } from '../../application/services/invoices.service';
import type { Response } from 'express';
import { TierGuard } from '../../../../shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '../../../../shared/modules/auth/auth/tier.decorator';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { Role, InvoiceStatus } from '@workspace/db';

import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
} from '../../application/dto/invoices.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('invoices')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ZodSerializerDto(PaginatedInvoiceResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: InvoiceStatus,
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
  @ZodSerializerDto(InvoiceResponseDto)
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.invoicesService.findOne(id, req.user.clinicId);
  }

  @Post()
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoiceResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create({
      ...dto,
      clinicId: req.user.clinicId,
    });
  }

  @Patch(':id')
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoiceResponseDto)
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, dto, req.user.clinicId);
  }

  @Get(':id/pdf')
  async generatePDF(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoicesService.generatePDF(
      id,
      req.user.clinicId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`,
    );
    res.send(pdfBuffer);
  }
}
