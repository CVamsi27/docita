import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';

interface RazorpayPaymentLinkEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment_link: {
      entity: RazorpayPaymentLinkEntity;
    };
  };
}

@Controller('webhooks/payments')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    await this.paymentsService.handleRazorpayWebhook(payload, signature);
    return { status: 'ok' };
  }
}
