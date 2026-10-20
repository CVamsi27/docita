import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { DESK_COLLECTIBLE_INVOICE_STATUSES } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { InvoicesService } from '@/domains/billing/application/services/invoices.service';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import {
  DeskOpenInvoicesResponseDto,
  DeskRecordInvoiceSettlementBodyDto,
  ListDeskOpenInvoicesQueryDto,
} from '@/domains/billing/application/dto/desk.dto';
import { AnyResponseDto } from '@/domains/billing/application/dto/payments.dto';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import { getBillingRequestContext } from './billing-request-context';

/**
 * Flow B (patient pays clinic): front-desk settlement (cash / POS / UPI /
 * terminal metadata). Separate from {@link PaymentsController} payment links,
 * from optional clinic payment **settings** (Flow A), and from **Docita SaaS**
 * subscription checkout. See docs/product/PAYMENT_FLOWS.md.
 */
@Controller('desk')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DeskController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('invoices')
  @RequireFeature(Feature.INVOICING)
  @ZodSerializerDto(DeskOpenInvoicesResponseDto)
  async listOpenInvoices(
    @Query() query: ListDeskOpenInvoicesQueryDto,
    @Request() req: RequestWithUser,
  ) {
    const { clinicId } = getBillingRequestContext(req);
    await logPatientPhiRead(
      this.auditService,
      req,
      query.patientId,
      'VIEW_PROFILE',
    );

    return this.invoicesService.findAll(clinicId, {
      patientId: query.patientId,
      limit: query.limit,
      statuses: [...DESK_COLLECTIBLE_INVOICE_STATUSES],
    });
  }

  @Post('invoices/:invoiceId/settlement')
  @RequireFeature(Feature.INVOICING)
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @RequiresIdempotency()
  @ZodSerializerDto(AnyResponseDto)
  recordInvoiceSettlement(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: DeskRecordInvoiceSettlementBodyDto,
    @Request() req: RequestWithUser,
  ) {
    const { clinicId, userId } = getBillingRequestContext(req);

    return this.paymentsService.markInvoicePaidManually({
      invoiceId,
      clinicId,
      performedByUserId: userId,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      notes: dto.notes,
      reference: dto.reference,
    });
  }
}
