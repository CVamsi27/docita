import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import {
  type WithAdvisoryLock,
  withAdvisoryLock,
} from '@/shared/common/utils/postgres-advisory-lock';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { generateReferrerCode } from './referral-code.rules';

/**
 * Idempotent one-time backfill of `Referrer.code` for any row that
 * pre-dates the `20260727120000_referral_partner_self_service`
 * migration (the column was added as nullable to honour the
 * additive-only schema-lock rule, so the live `Referrer.code` rows
 * are still NULL until something writes them).
 *
 * Triggered automatically on:
 *   1. API boot — every API replica registers the service, so the
 *      first replica to come up after a deploy runs the backfill
 *      while the rest short-circuit via the advisory lock.
 *   2. Worker boot — same posture; the worker is a long-running
 *      process so the hook fires there too as a belt-and-suspenders
 *      backstop in case the API never restarted.
 *   3. `REFERRER_BACKFILL_REQUESTED` event — re-runs on demand from
 *      the operator console (e.g. a one-off retry after a fix).
 *
 * The hook is **non-fatal**: a backfill error is logged and does not
 * prevent the process from booting. Operators can re-run via the
 * event trigger or the manual `scripts/backfill-referrer-codes.ts
 * --apply` script.
 */
@Injectable()
export class ReferrerCodeBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReferrerCodeBackfillService.name);

  /** Advisory-lock name; must match across API + worker. */
  private static readonly LOCK_NAME = 'referrer-code-backfill';

  /** Re-bind per batch to avoid pulling a stale snapshot if the
   *  process reuses a connection across backfills. */
  private static readonly MAX_BATCH = 200;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    /**
     * The advisory-lock helper is injected so tests can swap it for
     * an in-process no-op. In production it points at the real
     * `withAdvisoryLock` from `shared/common/utils/postgres-advisory-lock`.
     */
    private readonly withLock: WithAdvisoryLock<{
      written: number;
    }> = withAdvisoryLock,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.runBackfill();
  }

  @OnEvent(ApplicationEvents.REFERRER_BACKFILL_REQUESTED)
  async onManualTrigger(): Promise<void> {
    await this.runBackfill();
  }

  /**
   * The actual backfill. Exposed publicly so the `scripts/`
   * directory can also call it (one day — for now the script
   * inlines its own loop using the same `generateReferrerCode`).
   */
  async runBackfill(): Promise<{ written: number }> {
    const initialNull = await this.prisma.referrer.count({
      where: { code: null },
    });
    if (initialNull === 0) {
      this.logger.log('No referrers with NULL code; backfill is a no-op.');
      return { written: 0 };
    }
    this.logger.log(
      `Backfill starting: ${initialNull} referrer(s) with NULL code.`,
    );

    // Try-acquire the advisory lock; if another replica is already
    // running the backfill, skip and let it finish.
    const result = await this.withLock(
      this.prisma,
      ReferrerCodeBackfillService.LOCK_NAME,
      () => this.backfillInBatches(),
      5_000,
    );

    if (result === null) {
      this.logger.log(
        'Another process is already running the backfill; skipping.',
      );
      return { written: 0 };
    }
    this.logger.log(`Backfill done: wrote ${result.written} referrer code(s).`);
    return result;
  }

  private async backfillInBatches(): Promise<{ written: number }> {
    let written = 0;
    // Loop in batches so we don't hold a single transaction open for
    // thousands of rows. Each iteration picks the next chunk of
    // NULL-coded referrers, generates a unique code per row, and
    // conditionally writes (the `code: null` guard makes the write
    // idempotent across racing processes).
    for (;;) {
      const remaining = await this.prisma.referrer.count({
        where: { code: null },
      });
      if (remaining === 0) break;

      const batch = await this.prisma.referrer.findMany({
        where: { code: null },
        orderBy: { createdAt: 'asc' },
        take: Math.min(remaining, ReferrerCodeBackfillService.MAX_BATCH),
        select: { id: true },
      });
      if (batch.length === 0) break;

      for (const row of batch) {
        const code = await this.generateUniqueCode();
        // The `code: null` predicate in `where` makes this safe
        // against concurrent writers — the second concurrent
        // `updateMany` for the same id sees `count: 0`.
        const res = await this.prisma.referrer.updateMany({
          where: { id: row.id, code: null },
          data: { code },
        });
        if (res.count > 0) {
          written += 1;
        }
      }
    }
    return { written };
  }

  /**
   * Generate a code that doesn't collide with any existing
   * `Referrer.code` value, with a 16-attempt cap. The 32^6
   * code space (~1.07B) makes a collision astronomically
   * unlikely even on a fully-populated table, so this loop
   * is just a defense-in-depth check.
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const code = generateReferrerCode();
      const existing = await this.prisma.referrer.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new Error(
      'Unable to generate a unique referrer code after 16 attempts',
    );
  }
}
