import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../../../../shared/modules/auth/auth/public.decorator';
import { ProcessWebhookUseCase } from '../../application/use-cases';
import type { RazorpayWebhookPayload } from '@workspace/types';

@Controller('webhooks/subscriptions')
export class SubscriptionsWebhookController {
  constructor(private readonly processWebhookUseCase: ProcessWebhookUseCase) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }
    return this.processWebhookUseCase.execute(
      signature,
      JSON.stringify(payload),
      payload,
    );
  }
}
