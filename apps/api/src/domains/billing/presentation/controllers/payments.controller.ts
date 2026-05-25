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
  AnyResponseDto,
  CreatePaymentLinkDto,
  PaymentLinkResponseDto,
  PaymentSessionResponseDto,
} from '@/domains/billing/application/dto/payments.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { getBillingRequestContext } from './billing-request-context';

@Controller('payments')
@UseGuards(TierGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('link')
  @RequireFeature(Feature.PAYMENT_LINKS)
  @RequiresIdempotency()
  @ZodSerializerDto(PaymentLinkResponseDto)
  async createPaymentLink(
    @Body() dto: CreatePaymentLinkDto,
    @Request() req: RequestWithUser,
  ) {
    const { clinicId } = getBillingRequestContext(req);

    return this.paymentsService.createPaymentLink({
      ...dto,
      clinicId,
      currency: dto.currency || this.configService.getCurrencyCode(),
    });
  }

  @Post(':id/send-whatsapp')
  @RequireFeature(Feature.PAYMENT_LINKS)
  @ZodSerializerDto(AnyResponseDto)
  async sendWhatsApp(@Param('id') id: string, @Request() req: RequestWithUser) {
    const { clinicId } = getBillingRequestContext(req);
    await this.paymentsService.verifySessionOwnership(id, clinicId);
    return this.paymentsService.sendPaymentLinkWhatsApp(id, clinicId);
  }

  @Get(':id')
  @RequireFeature(Feature.PAYMENT_LINKS)
  @ZodSerializerDto(PaymentSessionResponseDto)
  async getPaymentSession(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const { clinicId } = getBillingRequestContext(req);
    await this.paymentsService.verifySessionOwnership(id, clinicId);
    return this.paymentsService.getPaymentSession(id, clinicId);
  }
}
