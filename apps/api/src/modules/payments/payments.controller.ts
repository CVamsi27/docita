import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentLinkDto,
  PaymentLinkResponseDto,
  PaymentSessionResponseDto,
  AnyResponseDto,
} from './dto/payments.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { UseInterceptors } from '@nestjs/common';

@Controller('payments')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@UseInterceptors(IdempotencyInterceptor)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('link')
  @Idempotent()
  @ZodSerializerDto(PaymentLinkResponseDto)
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink({
      ...dto,
      currency: dto.currency || 'INR',
    });
  }

  @Post(':id/send-whatsapp')
  @ZodSerializerDto(AnyResponseDto)
  async sendWhatsApp(@Param('id') id: string) {
    return this.paymentsService.sendPaymentLinkWhatsApp(id);
  }

  @Get(':id')
  @ZodSerializerDto(PaymentSessionResponseDto)
  async getPaymentSession(@Param('id') id: string) {
    return this.paymentsService.getPaymentSession(id);
  }
}
