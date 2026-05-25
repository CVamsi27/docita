import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

const BATCH = 5000;

@Injectable()
export class EphemeralStoreCleanupScheduler {
  private readonly logger = new Logger(EphemeralStoreCleanupScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Cron(CRON_SCHEDULES.EPHEMERAL_STORE_CLEANUP, {
    disabled: isCronDisabledInThisProcess(),
  })
  async purgeExpiredRows(): Promise<void> {
    const now = this.clock.now();
    try {
      let idempotencyTotal = 0;
      let webhookTotal = 0;
      for (let i = 0; i < 20; i += 1) {
        // check-n-plus-1: allow — batched purge; each round depends on prior deleteMany
        const stale = await this.prisma.apiHttpIdempotencyRecord.findMany({
          where: {
            OR: [
              { status: 'COMPLETED', recordExpiresAt: { lt: now } },
              { status: 'PROCESSING', processingExpiresAt: { lt: now } },
            ],
          },
          select: { id: true },
          take: BATCH,
        });
        if (stale.length === 0) break;
        const idRes = await this.prisma.apiHttpIdempotencyRecord.deleteMany({
          where: { id: { in: stale.map((r) => r.id) } },
        });
        idempotencyTotal += idRes.count;
        if (stale.length < BATCH) break;
      }
      for (let i = 0; i < 20; i += 1) {
        // check-n-plus-1: allow — batched purge; each round depends on prior deleteMany
        const staleWh = await this.prisma.webhookReplayDedupe.findMany({
          where: { expiresAt: { lt: now } },
          select: { id: true },
          take: BATCH,
        });
        if (staleWh.length === 0) break;
        const whRes = await this.prisma.webhookReplayDedupe.deleteMany({
          where: { id: { in: staleWh.map((r) => r.id) } },
        });
        webhookTotal += whRes.count;
        if (staleWh.length < BATCH) break;
      }
      if (idempotencyTotal > 0 || webhookTotal > 0) {
        this.logger.log(
          `Ephemeral store cleanup removed idempotency=${idempotencyTotal} webhookDedupe=${webhookTotal} rows`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Ephemeral store cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
