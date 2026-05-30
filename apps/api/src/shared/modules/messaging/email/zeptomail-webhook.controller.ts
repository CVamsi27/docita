import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { EmailSuppressionReason } from '@workspace/db';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EmailSuppressionService } from './email-suppression.service';
import {
  verifySignature,
  determineSuppressionReason,
  extractRecipientEmails,
} from './zeptomail-webhook.parser';

/** Permanent reasons that should suppress future sends (soft bounces don't). */
const SUPPRESSING_REASONS: ReadonlySet<EmailSuppressionReason> = new Set([
  EmailSuppressionReason.HARD_BOUNCE,
  EmailSuppressionReason.COMPLAINT,
  EmailSuppressionReason.UNSUBSCRIBE,
]);

/**
 * Receives ZeptoMail delivery webhooks (bounces / complaints / unsubscribes)
 * and adds the affected addresses to the suppression list. Authenticity is
 * verified by an HMAC-SHA256 signature of the raw body against
 * `ZEPTOMAIL_WEBHOOK_SECRET`; configure the ESP to sign and send it in the
 * `x-zoho-signature` header (adjust the header here if your ESP differs).
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
    @Headers('x-zoho-signature') signatureHeader?: string,
  ): Promise<{ received: true; suppressed: number }> {
    const rawBody = req.rawBody ?? Buffer.from('');
    const secret = this.configService.getZeptoMailWebhookSecret();
    if (!verifySignature(rawBody, signatureHeader, secret)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payload = req.body;
    const reason = determineSuppressionReason(payload);
    if (!reason || !SUPPRESSING_REASONS.has(reason)) {
      return { received: true, suppressed: 0 };
    }

    const emails = extractRecipientEmails(
      payload,
      this.configService.getEmailSenderDomain(),
    );
    let suppressed = 0;
    for (const email of emails) {
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
}
