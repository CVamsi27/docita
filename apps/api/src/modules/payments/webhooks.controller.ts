import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks/payments')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ) {
    await this.paymentsService.handleRazorpayWebhook(payload, signature);
    return { status: 'ok' };
  }
}
