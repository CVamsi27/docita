import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PartnerShowcasePdfService } from './partner-showcase-pdf.service';
import { PartnerTemplateService } from './partner-template.service';

/**
 * Listens for the `REFERRER_CREATED` event and sends the partner welcome
 * message + Docita showcase PDF via WhatsApp. Non-fatal: any failure is
 * recorded on the `Referrer` row and the operator can resend from the
 * internal page.
 *
 * Why a non-fatal wrapper: a referrer row has already been created in the
 * DB by the time this fires; a WhatsApp hiccup must not roll the row back
 * or block the operator's flow.
 */
@Injectable()
export class ReferrerWelcomeService {
  private readonly logger = new Logger(ReferrerWelcomeService.name);

  /** 24h signed URL — long enough for the partner to download, short enough
   *  to avoid a permanently-shared secret. */
  private static readonly PDF_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PartnerShowcasePdfService,
    private readonly template: PartnerTemplateService,
    private readonly storage: StorageProvider,
    @Inject(WHATSAPP_CLIENT_TOKEN) private readonly whatsapp: IWhatsAppClient,
    private readonly appConfig: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @OnEvent(ApplicationEvents.REFERRER_CREATED)
  async handle(payload: { referrerId: string }): Promise<void> {
    try {
      await this.sendWelcome(payload.referrerId, { trigger: 'CREATE' });
    } catch (error) {
      // Last-ditch: at minimum record the error so the operator sees it.
      this.logger.error(
        `Welcome pipeline crashed for referrer ${payload.referrerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      try {
        await this.prisma.referrer.update({
          where: { id: payload.referrerId },
          data: { welcomeError: errorMessage(error) },
        });
      } catch (nestedError) {
        this.logger.error(
          `Could not record welcomeError for referrer ${payload.referrerId}`,
          nestedError instanceof Error ? nestedError.stack : String(nestedError),
        );
      }
    }
  }

  /**
   * Operator-triggered resend (from the internal referrals page). Same
   * pipeline as the create path; the `kind` on the ReferrerMessage row
   * records the source so the audit log is unambiguous.
   */
  async resendWelcome(referrerId: string): Promise<void> {
    await this.sendWelcome(referrerId, { trigger: 'RESEND' });
  }

  private async sendWelcome(
    referrerId: string,
    opts: { trigger: 'CREATE' | 'RESEND' },
  ): Promise<void> {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        code: true,
        active: true,
      },
    });

    if (!referrer) {
      this.logger.warn(`Referrer ${referrerId} not found; skipping welcome`);
      return;
    }
    if (!referrer.phone) {
      const message = 'Referrer has no phone number on file';
      await this.recordFailure(referrerId, message);
      return;
    }
    if (!referrer.code) {
      const message = 'Referrer has no code (backfill not run?)';
      await this.recordFailure(referrerId, message);
      return;
    }
    if (!referrer.active) {
      this.logger.log(
        `Skipping welcome for inactive referrer ${referrerId}`,
      );
      return;
    }

    const partnerPortalUrl = this.appConfig.getPartnerPortalUrl();
    const signupUrl = `${this.appConfig.getAppUrl()}/onboarding?ref=${referrer.code}`;

    // Render the share message first so the welcome body and the partner's
    // "Share" page use the exact same wording.
    const shareMessage = this.template.renderShareMessage({
      partnerName: referrer.name,
      code: referrer.code,
      signupUrl,
    });

    // Render the showcase PDF + upload to storage + sign a 24h URL.
    const pdfBuffer = await this.pdf.render({
      partnerName: referrer.name,
      partnerType: referrer.type,
      code: referrer.code,
      partnerPortalUrl,
      signupUrl,
    });

    const objectKey = `partners/${referrer.id}/showcase-${Date.now()}.pdf`;
    await this.storage.uploadBuffer(
      pdfBuffer,
      objectKey,
      'application/pdf',
      { metadata: { referrerId: referrer.id, kind: 'partner-showcase' } },
    );
    const pdfUrl = await this.storage.generateSignedUrl(
      objectKey,
      ReferrerWelcomeService.PDF_SIGNED_URL_TTL_SECONDS,
    );

    // Build the WABA template components.
    const tpl = this.template.renderWelcomeComponents({
      partnerName: referrer.name,
      partnerType: referrer.type,
      code: referrer.code,
      partnerPortalUrl,
      shareMessage,
      pdfUrl,
    });

    // Send + log.
    const now = this.clock.now();
    const messageRow = await this.prisma.referrerMessage.create({
      data: {
        referrerId: referrer.id,
        kind: opts.trigger === 'CREATE' ? 'WELCOME' : 'RESEND_WELCOME',
        channel: 'whatsapp',
        template: tpl.templateName,
        status: 'QUEUED',
        // PII-redacted payload: no phone number, no PDF URL (signed, ephemeral).
        payload: toPrismaInputJsonValue({
          partnerName: referrer.name,
          code: referrer.code,
          partnerPortalUrl,
          signupUrl,
          type: referrer.type,
          shareMessagePreview: truncate(shareMessage, 280),
        }),
        createdAt: now,
      },
      select: { id: true },
    });

    try {
      const result = await this.whatsapp.sendMessage({
        to: referrer.phone,
        templateName: tpl.templateName,
        languageCode: tpl.languageCode,
        components: tpl.components,
      });

      await this.prisma.referrerMessage.update({
        where: { id: messageRow.id },
        data: {
          status: 'SENT',
          externalId: result.externalId,
          sentAt: this.clock.now(),
        },
      });
      await this.prisma.referrer.update({
        where: { id: referrer.id },
        data: { welcomeSentAt: this.clock.now(), welcomeError: null },
      });
    } catch (error) {
      const message = errorMessage(error);
      await this.prisma.referrerMessage.update({
        where: { id: messageRow.id },
        data: { status: 'FAILED', errorMessage: message },
      });
      await this.recordFailure(referrer.id, message);
      throw error;
    }
  }

  private async recordFailure(referrerId: string, message: string): Promise<void> {
    await this.prisma.referrer.update({
      where: { id: referrerId },
      data: { welcomeError: message },
    });
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function toPrismaInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
