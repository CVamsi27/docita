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
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import {
  PdfJobService,
  type PdfJobServicePort,
} from '@/shared/modules/queue/pdf-job.service';
import type { Response } from 'express';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  RequireTier,
  Feature,
  Tier,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { parseInvoiceListStatus } from '@/domains/billing/infrastructure/repositories/invoice-list-status';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  ListInvoicesQueryDto,
  InvoicePaymentActivityResponseDto,
} from '@/domains/billing/application/dto/invoices.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { getBillingRequestContext } from './billing-request-context';
import { setPrivateNoStoreHeaders } from '@/shared/common/http/private-download-response';

@Controller('invoices')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequireTier(Tier.STARTER)
  @ZodSerializerDto(PaginatedInvoiceResponseDto)
  async findAll(
    @Request() req: RequestWithUser,
    @Query() query?: ListInvoicesQueryDto,
  ) {
    const { clinicId } = getBillingRequestContext(req);
    const { cursor, limit, patientId, status, date, search } = query ?? {};

    if (patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        patientId,
        'VIEW_PROFILE',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_PATIENT_LIST',
        'Patient',
        { scope: 'invoices', status, date, search, cursor, limit },
      );
    }

    return this.invoicesService.findAll(clinicId, {
      cursor,
      limit,
      patientId,
      status: parseInvoiceListStatus(status),
      date,
      search,
    });
  }

  @Get(':id/payment-activity')
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoicePaymentActivityResponseDto)
  async getPaymentActivity(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { clinicId } = getBillingRequestContext(req);
    const invoice = await this.invoicesService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      invoice.patientId,
      'VIEW_PROFILE',
    );
    return this.invoicesService.listPaymentActivity(id, clinicId);
  }

  @Get(':id')
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoiceResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getBillingRequestContext(req);
    const invoice = await this.invoicesService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      invoice.patientId,
      'VIEW_PROFILE',
    );
    return invoice;
  }

  @Post()
  @RequiresIdempotency()
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoiceResponseDto)
  create(@Request() req: RequestWithUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create({
      ...dto,
      clinicId: getBillingRequestContext(req).clinicId,
    });
  }

  @Patch(':id')
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(InvoiceResponseDto)
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(
      id,
      dto,
      getBillingRequestContext(req).clinicId,
    );
  }

  @Get(':id/claim-readiness')
  @RequireFeature(Feature.INVOICING)
  async getClaimReadiness(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { clinicId } = getBillingRequestContext(req);
    const invoice = await this.invoicesService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      invoice.patientId,
      'VIEW_PROFILE',
    );
    return this.invoicesService.getClaimReadiness(id, clinicId);
  }

  @Post(':id/submit-claim')
  @RequireFeature(Feature.INVOICING)
  submitClaim(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.invoicesService.submitClaim(
      id,
      getBillingRequestContext(req).clinicId,
    );
  }

  @Get(':id/pdf/status')
  @RequireFeature(Feature.INVOICING)
  async getPdfStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    setPrivateNoStoreHeaders(res);
    const { clinicId } = getBillingRequestContext(req);
    const invoice = await this.invoicesService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      invoice.patientId,
      'VIEW_PROFILE',
    );
    return this.pdfJobService.getStatus(jobId, clinicId);
  }

  @Get(':id/pdf')
  @RequireFeature(Feature.INVOICING)
  async generatePDF(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Query('async') isAsync: string,
    @Res() res: Response,
  ) {
    setPrivateNoStoreHeaders(res);
    const { clinicId } = getBillingRequestContext(req);
    const invoice = await this.invoicesService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      invoice.patientId,
      'VIEW_PROFILE',
    );

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
