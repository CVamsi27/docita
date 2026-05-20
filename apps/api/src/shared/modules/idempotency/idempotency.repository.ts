import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import type { CachedIdempotencyEntry } from './idempotency.service';
import {
  IDEMPOTENCY_PROCESSING_TTL_SECONDS,
  IDEMPOTENCY_TTL_SECONDS_DEFAULT,
} from './idempotency.constants';

function addSeconds(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

/** Json column persistence: strip non-JSON types (e.g. Date) Prisma may reject. */
function responseAsJsonInput(response: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(response, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class IdempotencyRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async findActiveCompleted(
    scopedKey: string,
  ): Promise<CachedIdempotencyEntry | null> {
    const now = this.clock.now();
    const row = await this.prisma.apiHttpIdempotencyRecord.findFirst({
      where: {
        scopedKey,
        status: 'COMPLETED',
        recordExpiresAt: { gt: now },
      },
    });
    if (!row) return null;
    if (typeof row.bodyHash !== 'string') return null;
    return {
      bodyHash: row.bodyHash,
      response: row.response as unknown,
      createdAt: row.createdAt.getTime(),
    };
  }

  async isKeyProcessing(scopedKey: string): Promise<boolean> {
    const now = this.clock.now();
    const count = await this.prisma.apiHttpIdempotencyRecord.count({
      where: {
        scopedKey,
        status: 'PROCESSING',
        processingExpiresAt: { gt: now },
      },
    });
    return count > 0;
  }

  /**
   * Claims in-flight processing for a key. Throws ConflictException when an
   * active PROCESSING or COMPLETED row already exists for this scopedKey.
   *
   * Uses separate statements instead of a single interactive transaction: the
   * Prisma Postgres driver can leave the client unusable after a rolled-back tx
   * that hit a unique violation, which then breaks unrelated writes such as
   * {@link completeProcessing}.
   */
  async markProcessing(scopedKey: string): Promise<void> {
    const now = this.clock.now();
    const processingExpiresAt = addSeconds(
      now,
      IDEMPOTENCY_PROCESSING_TTL_SECONDS,
    );
    const processingGuardExpiresAt = addSeconds(
      now,
      IDEMPOTENCY_PROCESSING_TTL_SECONDS + IDEMPOTENCY_TTL_SECONDS_DEFAULT,
    );

    await this.prisma.apiHttpIdempotencyRecord.deleteMany({
      where: {
        scopedKey,
        OR: [
          {
            status: 'PROCESSING',
            processingExpiresAt: { lt: now },
          },
          {
            status: 'COMPLETED',
            recordExpiresAt: { lt: now },
          },
        ],
      },
    });

    try {
      await this.prisma.apiHttpIdempotencyRecord.create({
        data: {
          scopedKey,
          bodyHash: '',
          status: 'PROCESSING',
          processingExpiresAt,
          recordExpiresAt: processingGuardExpiresAt,
        },
      });
    } catch (error) {
      if (!isPrismaUniqueViolation(error)) {
        throw error;
      }
      const existing = await this.prisma.apiHttpIdempotencyRecord.findUnique({
        where: { scopedKey },
      });
      if (!existing) {
        throw error;
      }
      if (
        existing.status === 'PROCESSING' &&
        existing.processingExpiresAt > now
      ) {
        throw new ConflictException(
          'A request with this Idempotency-Key is already in progress.',
        );
      }
      if (existing.status === 'COMPLETED' && existing.recordExpiresAt > now) {
        throw new ConflictException(
          'A request with this Idempotency-Key is already in progress.',
        );
      }
      throw error;
    }
  }

  async completeProcessing(
    scopedKey: string,
    bodyHash: string,
    response: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const now = this.clock.now();
    const recordExpiresAt = addSeconds(now, ttlSeconds);
    const jsonResponse = responseAsJsonInput(response);
    const updated = await this.prisma.apiHttpIdempotencyRecord.updateMany({
      where: { scopedKey, status: 'PROCESSING' },
      data: {
        status: 'COMPLETED',
        bodyHash,
        response: jsonResponse,
        recordExpiresAt,
      },
    });
    if (updated.count === 0) {
      await this.prisma.apiHttpIdempotencyRecord.upsert({
        where: { scopedKey },
        create: {
          scopedKey,
          bodyHash,
          status: 'COMPLETED',
          response: jsonResponse,
          processingExpiresAt: now,
          recordExpiresAt,
        },
        update: {
          status: 'COMPLETED',
          bodyHash,
          response: jsonResponse,
          recordExpiresAt,
        },
      });
    }
  }

  async abortProcessing(scopedKey: string): Promise<void> {
    await this.prisma.apiHttpIdempotencyRecord.deleteMany({
      where: { scopedKey, status: 'PROCESSING' },
    });
  }
}
