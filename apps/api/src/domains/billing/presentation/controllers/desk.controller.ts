import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import { DeskRecordInvoiceSettlementBodyDto } from '@/domains/billing/application/dto/desk.dto';
import { AnyResponseDto } from '@/domains/billing/application/dto/payments.dto';

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
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices/:invoiceId/settlement')
  @RequireFeature(Feature.INVOICING)
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(AnyResponseDto)
  recordInvoiceSettlement(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: DeskRecordInvoiceSettlementBodyDto,
    @Request() req: RequestWithUser,
  ) {
    return this.paymentsService.markInvoicePaidManually({
      invoiceId,
      clinicId: req.user!.clinicId!,
      performedByUserId: req.user!.id,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      notes: dto.notes,
      reference: dto.reference,
    });
  }
}
