import { Controller, Post, Req, HttpCode, Logger } from '@nestjs/common';
import { Request } from 'express';
import { EmailSuppressionReason } from '@workspace/db';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EmailSuppressionService } from './email-suppression.service';
import {
  verifySignature,
  secretsMatch,
  parseZeptoMailEvents,
} from './zeptomail-webhook.parser';

/** Permanent reasons that should suppress future sends (soft bounces don't). */
const SUPPRESSING_REASONS: ReadonlySet<EmailSuppressionReason> = new Set([
  EmailSuppressionReason.HARD_BOUNCE,
  EmailSuppressionReason.COMPLAINT,
  EmailSuppressionReason.UNSUBSCRIBE,
]);

function headerString(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Receives ZeptoMail delivery webhooks (bounces / complaints / unsubscribes) and
 * adds the affected addresses to the suppression list.
 *
 * ZeptoMail requires the endpoint to be unauthenticated and to always return
 * 200, and authenticates instead via a configured **Authorization header**.
 * So we verify a shared secret (`ZEPTOMAIL_WEBHOOK_SECRET`) supplied in the
 * `Authorization` (or `x-webhook-secret`) header — constant-time — and only
 * process the payload when it matches. An `x-zoho-signature` HMAC is accepted as
 * a fallback. Until the secret is configured the payload is ignored (but we
 * still answer 200 so the ESP's reachability check passes).
 */
@Controller('webhooks/email')
export class ZeptoMailWebhookController {
  private readonly logger = new Logger(ZeptoMailWebhookController.name);

  constructor(
    private readonly suppression: EmailSuppressionService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Post('zeptomail')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer; body?: unknown },
  ): Promise<{ received: true; suppressed: number }> {
    if (!this.isAuthorized(req)) {
      return { received: true, suppressed: 0 };
    }

    const events = parseZeptoMailEvents(req.body);
    let suppressed = 0;
    for (const { email, reason } of events) {
      if (!SUPPRESSING_REASONS.has(reason)) continue;
      try {
        await this.suppression.recordSuppression(
          email,
          reason,
          `esp:${reason}`,
        );
        suppressed += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to record email suppression: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return { received: true, suppressed };
  }

  private isAuthorized(req: Request & { rawBody?: Buffer }): boolean {
    const secret = this.configService.getZeptoMailWebhookSecret();
    if (!secret) {
      this.logger.warn(
        'ZEPTOMAIL_WEBHOOK_SECRET is not set; ignoring email webhook payload',
      );
      return false;
    }
    const signature = headerString(req, 'x-zoho-signature');
    if (signature) {
      return verifySignature(req.rawBody ?? Buffer.from(''), signature, secret);
    }
    const provided =
      headerString(req, 'authorization') ??
      headerString(req, 'x-webhook-secret');
    return secretsMatch(provided, secret);
  }
}
