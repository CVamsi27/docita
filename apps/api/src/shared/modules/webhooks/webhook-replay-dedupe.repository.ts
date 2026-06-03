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
   *
   * Uses deleteMany for expired entries (safe if row doesn't exist) followed by
   * a create attempt. On unique violation, if the existing record is still
   * unexpired, it's a replay. If expired, another claim won the race; the
   * caller should treat it as a new claim since the dedupe window passed.
   */
  async tryClaim(dedupeKeyHash: string, expiresAt: Date): Promise<boolean> {
    const now = this.clock.now();

    await this.prisma.webhookReplayDedupe.deleteMany({
      where: { dedupeKeyHash, expiresAt: { lte: now } },
    });

    try {
      await this.prisma.webhookReplayDedupe.create({
        data: { dedupeKeyHash, expiresAt },
      });
      return true;
    } catch (error) {
      if (!isPrismaUniqueViolation(error)) {
        throw error;
      }
      return false;
    }
  }
}
