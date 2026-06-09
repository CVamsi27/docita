import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';

export type RazorpayWebhookRequest = Request & { rawBody?: Buffer };

/**
 * Shared Razorpay ingress verification (signature + replay dedupe).
 * Billing and subscriptions keep separate routes and handlers after verification.
 */
export async function assertVerifiedRazorpayWebhook(params: {
  req: RazorpayWebhookRequest;
  signature: string | undefined;
  secret: string;
  verifier: WebhookVerifierService;
}): Promise<Buffer> {
  if (!params.signature) throw new BadRequestException('Missing signature');

  const rawBody = params.req.rawBody;
  if (!rawBody) throw new BadRequestException('Missing request body');

  const verification = await params.verifier.verify({
    provider: 'razorpay',
    rawBody,
    signature: params.signature,
    secret: params.secret,
  });

  if (!verification.ok) {
    if (verification.failure === 'replayed')
      throw new ConflictException('Webhook already processed');
    throw new UnauthorizedException('Invalid webhook signature');
  }

  return rawBody;
}
