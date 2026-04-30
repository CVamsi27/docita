import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete as _Delete,
  UseGuards,
  Request,
  Query,
  Res,
  HttpStatus,
  Inject,
} from '@nestjs/common';
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
import { RequestWithUser } from '@/common/types/common.types';
import { requireClinicId } from '@/common/utils/request-context.utils';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  ListInvoicesQueryDto,
} from '@/domains/billing/application/dto/invoices.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('invoices')
@UseGuards(TierGuard)
@RequireFeature(Feature.INVOICING)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
  ) {}

  @Get()
  @ZodSerializerDto(PaginatedInvoiceResponseDto)
  findAll(
    @Request() req: RequestWithUser,
    @Query() query?: ListInvoicesQueryDto,
  ) {
    const { cursor, limit, patientId, status, date, search } = query ?? {};

    return this.invoicesService.findAll(requireClinicId(req), {
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
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.invoicesService.findOne(id, requireClinicId(req));
  }

  @Post()
  @ZodSerializerDto(InvoiceResponseDto)
  create(@Request() req: RequestWithUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create({
      ...dto,
      clinicId: requireClinicId(req),
    });
  }

  @Patch(':id')
  @ZodSerializerDto(InvoiceResponseDto)
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, dto, requireClinicId(req));
  }

  @Get(':id/claim-readiness')
  getClaimReadiness(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.invoicesService.getClaimReadiness(id, requireClinicId(req));
  }

  @Post(':id/submit-claim')
  submitClaim(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.invoicesService.submitClaim(id, requireClinicId(req));
  }

  @Get(':id/pdf/status')
  getPdfStatus(@Request() req: RequestWithUser, @Query('jobId') jobId: string) {
    return this.pdfJobService.getStatus(jobId, requireClinicId(req));
  }

  @Get(':id/pdf')
  async generatePDF(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    const clinicId = requireClinicId(req);

    if (isAsync === 'true') {
      const result = await this.invoicesService.generatePdfAsync(id, clinicId);
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    const result = await this.invoicesService.getPdf(id, clinicId);

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
