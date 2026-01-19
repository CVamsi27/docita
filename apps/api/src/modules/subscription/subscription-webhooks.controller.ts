/**
 * Subscription Webhooks Controller
 * Handles Razorpay webhooks for subscription events
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import type { RazorpayWebhookPayload } from '@workspace/types';

@Controller('webhooks/subscriptions')
@SkipThrottle()
export class SubscriptionWebhooksController {
  constructor(private readonly webhookService: SubscriptionWebhookService) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: RazorpayWebhookPayload,
  ) {
    const rawBody = request.rawBody?.toString() || JSON.stringify(payload);
    await this.webhookService.processWebhook(signature, rawBody, payload);
    return { status: 'ok' };
  }
}
