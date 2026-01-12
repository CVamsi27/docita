import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('link')
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink({
      ...dto,
      currency: dto.currency || 'INR',
    });
  }

  @Post(':id/send-whatsapp')
  async sendWhatsApp(@Param('id') id: string) {
    return this.paymentsService.sendPaymentLinkWhatsApp(id);
  }

  @Get(':id')
  async getPaymentSession(@Param('id') id: string) {
    return this.paymentsService.getPaymentSession(id);
  }
}
