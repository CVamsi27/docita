import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ProcessWebhookUseCase } from '@/domains/subscriptions/application/use-cases';
import type { RazorpayWebhookPayload } from '@workspace/types';

@Controller('webhooks/subscriptions')
export class SubscriptionsWebhookController {
  constructor(private readonly processWebhookUseCase: ProcessWebhookUseCase) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    const rawBody = req.rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    return this.processWebhookUseCase.execute(signature, rawBody, payload);
  }
}
