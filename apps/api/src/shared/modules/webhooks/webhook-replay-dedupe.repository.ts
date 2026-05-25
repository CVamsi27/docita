import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { isRecord } from '@workspace/utils';

function isPrismaUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === 'P2002';
}

@Injectable()
export class WebhookReplayDedupeRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * @returns true if this delivery was newly recorded, false if it is a replay
   * (dedupeKeyHash already present and not expired).
   */
  async tryClaim(dedupeKeyHash: string, expiresAt: Date): Promise<boolean> {
    const now = this.clock.now();
    try {
      await this.prisma.webhookReplayDedupe.create({
        data: { dedupeKeyHash, expiresAt },
      });
      return true;
    } catch (error) {
      if (!isPrismaUniqueViolation(error)) {
        throw error;
      }
      const existing = await this.prisma.webhookReplayDedupe.findUnique({
        where: { dedupeKeyHash },
      });
      if (existing && existing.expiresAt > now) {
        return false;
      }
      if (existing) {
        await this.prisma.webhookReplayDedupe.delete({
          where: { dedupeKeyHash },
        });
      }
      try {
        await this.prisma.webhookReplayDedupe.create({
          data: { dedupeKeyHash, expiresAt },
        });
        return true;
      } catch (retryErr) {
        if (isPrismaUniqueViolation(retryErr)) {
          return false;
        }
        throw retryErr;
      }
    }
  }
}
