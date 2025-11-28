import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('link')
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    const session = await this.paymentsService.createPaymentSession({
      ...dto,
      currency: dto.currency || 'INR',
    });

    // Optionally auto-send WhatsApp
    if (dto.sendWhatsApp) {
      await this.paymentsService.sendPaymentLinkWhatsApp(session.id);
    }

    return {
      id: session.id,
      link: session.paymentLink,
      shortUrl: session.shortUrl,
      status: session.status,
      expiresAt: session.expiresAt,
    };
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
