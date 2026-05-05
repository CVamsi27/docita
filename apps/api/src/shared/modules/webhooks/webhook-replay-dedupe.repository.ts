import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class WebhookReplayDedupeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @returns true if this delivery was newly recorded, false if it is a replay
   * (dedupeKeyHash already present and not expired).
   */
  async tryClaim(dedupeKeyHash: string, expiresAt: Date): Promise<boolean> {
    const now = new Date();
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
