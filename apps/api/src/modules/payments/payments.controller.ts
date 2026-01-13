import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentLinkDto,
  PaymentLinkResponseDto,
  PaymentSessionResponseDto,
  AnyResponseDto,
} from './dto/payments.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('link')
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
