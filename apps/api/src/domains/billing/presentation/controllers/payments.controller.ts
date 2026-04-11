import { Controller, Post, Get, Body, Param, Request } from '@nestjs/common';
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
import { Idempotent } from '@/shared/modules/auth/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { RequestWithUser } from '@/common/types/common.types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Controller('payments')
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
      clinicId: req.user!.clinicId!,
      currency: dto.currency || this.configService.getCurrencyCode(),
    });
  }

  @Post(':id/send-whatsapp')
  @ZodSerializerDto(AnyResponseDto)
  async sendWhatsApp(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.paymentsService.verifySessionOwnership(id, req.user!.clinicId!);
    return this.paymentsService.sendPaymentLinkWhatsApp(id);
  }

  @Get(':id')
  @ZodSerializerDto(PaymentSessionResponseDto)
  async getPaymentSession(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.paymentsService.verifySessionOwnership(id, req.user!.clinicId!);
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
      clinicId: req.user!.clinicId!,
      performedByUserId: req.user!.id,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount!,
      notes: dto.notes,
    });
  }
}
