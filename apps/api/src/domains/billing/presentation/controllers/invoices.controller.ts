import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete as _Delete,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
  Res,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  IdempotencyInterceptor,
  RequiresIdempotency,
} from '@/shared/modules/idempotency';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import {
  PdfJobService,
  type PdfJobServicePort,
} from '@/shared/modules/queue/pdf-job.service';
import type { Response } from 'express';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role, InvoiceStatus } from '@workspace/db';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  ListInvoicesQueryDto,
} from '@/domains/billing/application/dto/invoices.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('invoices')
@UseGuards(TierGuard)
@RequireFeature(Feature.INVOICING)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@UseInterceptors(IdempotencyInterceptor)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
  ) {}

  @Get()
  @ZodSerializerDto(PaginatedInvoiceResponseDto)
  findAll(@Request() req: AuthRequest, @Query() query?: ListInvoicesQueryDto) {
    const { cursor, limit, patientId, status, date, search } = query ?? {};

    return this.invoicesService.findAll(req.user.clinicId, {
      cursor,
      limit,
      patientId,
      status: status as InvoiceStatus | undefined,
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
  @RequiresIdempotency()
  @ZodSerializerDto(InvoiceResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create({
      ...dto,
      clinicId: req.user.clinicId,
    });
  }

  @Patch(':id')
  @ZodSerializerDto(InvoiceResponseDto)
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, dto, req.user.clinicId);
  }

  @Get(':id/claim-readiness')
  getClaimReadiness(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.invoicesService.getClaimReadiness(id, req.user.clinicId);
  }

  @Post(':id/submit-claim')
  submitClaim(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.invoicesService.submitClaim(id, req.user.clinicId);
  }

  @Get(':id/pdf/status')
  getPdfStatus(@Request() req: AuthRequest, @Query('jobId') jobId: string) {
    return this.pdfJobService.getStatus(jobId, req.user.clinicId);
  }

  @Get(':id/pdf')
  async generatePDF(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    if (isAsync === 'true') {
      const result = await this.invoicesService.generatePdfAsync(
        id,
        req.user.clinicId,
      );
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    const result = await this.invoicesService.getPdf(id, req.user.clinicId);

    if (result.type === 'url') {
      return res.json({ url: result.url });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`,
    );
    res.send(result.buffer);
  }
}
