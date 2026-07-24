import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

const MAX_JOB_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60_000;

@Injectable()
export class WhatsappCampaignDispatchCron {
  private readonly logger = new Logger(WhatsappCampaignDispatchCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendMessage: SendMessageUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Cron(CRON_SCHEDULES.WHATSAPP_CAMPAIGN_DISPATCH, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('whatsapp.campaign-dispatch')
  async run(): Promise<void> {
    const now = this.clock.now();
    const jobs = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH claimed AS (
        SELECT id
        FROM "WhatsAppBroadcastJob"
        WHERE "source" = 'CLINIC'
          AND "status" IN ('PENDING', 'RUNNING')
          AND "cancelRequestedAt" IS NULL
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now})
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= ${now})
          AND "attempts" < ${MAX_JOB_ATTEMPTS}
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 10
      )
      UPDATE "WhatsAppBroadcastJob" job
      SET "status" = 'RUNNING',
          "startedAt" = COALESCE(job."startedAt", ${now}),
          "lastAttemptAt" = ${now},
          "leaseExpiresAt" = ${new Date(now.getTime() + RETRY_DELAY_MS)},
          "attempts" = job."attempts" + 1
      FROM claimed
      WHERE job.id = claimed.id
      RETURNING job.id
    `;
    // Claimed jobs are independent (separate clinic, separate recipients,
    // separate lease). Run them in parallel so a slow WhatsApp API call on
    // one clinic does not block the others. Failures stay isolated via
    // allSettled so a single bad job cannot poison the whole tick.
    const results = await Promise.allSettled(
      jobs.map((job) => this.dispatch(job.id)),
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `WhatsApp campaign dispatch: ${failures.length} of ${results.length} job(s) failed`,
        failures.map((f) => f.reason).join('\n'),
      );
    }
  }

  private async dispatch(jobId: string): Promise<void> {
    const job = await this.prisma.whatsAppBroadcastJob.findUnique({
      where: { id: jobId },
      include: {
        // Pull `whatsappConsent` for each recipient's linked patient in
        // the same query. A 10k-recipient campaign previously issued
        // 10k extra `patient.findFirst` round-trips to evaluate consent;
        // this brings it down to one.
        recipients: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: {
            patient: {
              select: { whatsappConsent: true },
            },
          },
        },
      },
    });
    if (!job?.clinicId || job.status === 'CANCELLED') return;

    for (const recipient of job.recipients) {
      const patient = recipient.patient ?? null;
      if (!patient?.whatsappConsent) {
        await this.prisma.whatsAppBroadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SKIPPED',
            skipReason: 'WhatsApp consent missing at dispatch',
          },
        });
        continue;
      }
      try {
        const result = await this.sendMessage.execute({
          clinicId: job.clinicId,
          recipientPhone: recipient.phoneNumber,
          templateName: job.templateName ?? undefined,
          languageCode: job.languageCode,
          variables:
            recipient.variables && typeof recipient.variables === 'object'
              ? Object.fromEntries(
                  Object.entries(recipient.variables).filter(
                    (entry): entry is [string, string] =>
                      typeof entry[1] === 'string',
                  ),
                )
              : undefined,
        });
        await this.prisma.whatsAppBroadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            providerMessageId: result.providerMessageId,
            sentAt: this.clock.now(),
            attempts: { increment: 1 },
            lastAttemptAt: this.clock.now(),
            errorMessage: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.prisma.whatsAppBroadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: job.attempts >= MAX_JOB_ATTEMPTS ? 'FAILED' : 'PENDING',
            attempts: { increment: 1 },
            lastAttemptAt: this.clock.now(),
            errorMessage: message.slice(0, 1000),
          },
        });
        this.logger.warn(
          `WhatsApp campaign recipient send failed for job ${jobId}`,
        );
      }
    }

    const [pendingCount, sentCount, failedCount] = await Promise.all([
      this.prisma.whatsAppBroadcastRecipient.count({
        where: { broadcastJobId: jobId, status: 'PENDING' },
      }),
      this.prisma.whatsAppBroadcastRecipient.count({
        where: { broadcastJobId: jobId, status: 'SENT' },
      }),
      this.prisma.whatsAppBroadcastRecipient.count({
        where: { broadcastJobId: jobId, status: 'FAILED' },
      }),
    ]);
    const retry = pendingCount > 0 && job.attempts < MAX_JOB_ATTEMPTS;
    const completedAt = this.clock.now();
    await this.prisma.whatsAppBroadcastJob.update({
      where: { id: jobId },
      data: {
        sentCount,
        failedCount,
        status: retry ? 'PENDING' : 'COMPLETED',
        completedAt: retry ? null : completedAt,
        nextAttemptAt: retry
          ? new Date(completedAt.getTime() + RETRY_DELAY_MS)
          : null,
        leaseExpiresAt: null,
      },
    });
  }
}
