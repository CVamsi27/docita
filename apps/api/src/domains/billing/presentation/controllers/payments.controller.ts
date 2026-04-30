import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import {
  CreatePaymentLinkDto,
  PaymentLinkResponseDto,
  PaymentSessionResponseDto,
  MarkInvoicePaidDto,
  AnyResponseDto,
} from '@/domains/billing/application/dto/payments.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Idempotent } from '@/shared/modules/auth/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { RequestWithUser } from '@/common/types/common.types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  requireClinicId,
  requireUserId,
} from '@/common/utils/request-context.utils';

@Controller('payments')
@UseGuards(TierGuard)
@RequireFeature(Feature.PAYMENT_LINKS)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@UseInterceptors(IdempotencyInterceptor)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('link')
  @Idempotent()
  @ZodSerializerDto(PaymentLinkResponseDto)
  async createPaymentLink(
    @Body() dto: CreatePaymentLinkDto,
    @Request() req: RequestWithUser,
  ) {
    return this.paymentsService.createPaymentLink({
      ...dto,
      clinicId: requireClinicId(req),
      currency: dto.currency || this.configService.getCurrencyCode(),
    });
  }

  @Post(':id/send-whatsapp')
  @ZodSerializerDto(AnyResponseDto)
  async sendWhatsApp(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.paymentsService.verifySessionOwnership(id, requireClinicId(req));
    return this.paymentsService.sendPaymentLinkWhatsApp(id);
  }

  @Get(':id')
  @ZodSerializerDto(PaymentSessionResponseDto)
  async getPaymentSession(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.paymentsService.verifySessionOwnership(id, requireClinicId(req));
    return this.paymentsService.getPaymentSession(id);
  }

  @Post('invoices/:invoiceId/mark-paid')
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(AnyResponseDto)
  async markInvoicePaid(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: MarkInvoicePaidDto,
    @Request() req: RequestWithUser,
  ) {
    return this.paymentsService.markInvoicePaidManually({
      invoiceId,
      clinicId: requireClinicId(req),
      performedByUserId: requireUserId(req),
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      notes: dto.notes,
    });
  }
}
