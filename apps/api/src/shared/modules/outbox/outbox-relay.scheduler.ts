/**
 * Transactional outbox relay.
 *
 * Drains unprocessed `OutboxEvent` rows by republishing each payload through
 * the in-process `EventEmitter2` and marking the row `processedAt`. Failures
 * increment `attempts` and store the last error message; rows past the
 * retry ceiling are left in place for the DLQ alerting path.
 *
 * Dispatch uses `emitAsync`, not `emit`. `emit` returns synchronously, so a
 * listener declared as `async` (or any listener returning a promise) would be
 * abandoned the instant the row was marked `processedAt` — a rejection then
 * vanished with no record and no retry, silently losing a required effect.
 * `emitAsync` resolves only when every listener has settled, so the row's
 * acknowledgment is genuinely the listeners' completion. A listener that
 * rejects leaves the row unprocessed, which is retryable intent.
 *
 * Dispatch is bounded by `DISPATCH_TIMEOUT_MS` so one stuck listener cannot
 * hold the advisory lock and stall every subsequent tick.
 *
 * Delivery is at-least-once: a row that fails after some listeners already
 * ran will be re-dispatched, so listeners must be idempotent on `__outboxId`.
 *
 * See docs/architecture/decisions/0010-transactional-outbox.md.
 * check-n-plus-1: allow-file - row handling is batched with Promise.allSettled;
 * the SQL CTE's FOR UPDATE clause trips the regex-only scheduler guard.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';
import { withAdvisoryLock } from '@/shared/common/utils/postgres-advisory-lock';
import { runWithTenant } from '@/shared/common/middleware/tenant.middleware';
import {
  runOutsideActiveTx,
  runWithActiveTx,
} from '@/shared/modules/rls/active-tx.storage';
import { applyRlsScope } from '@/shared/modules/rls/apply-rls-scope';
import { getRlsRequestTransactionOptions } from '@/shared/common/database-transaction-options';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';

const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 8;
// Exponential backoff: don't retry rows that just failed. nextAttemptAt is
// derived from `attempts` so a transient error doesn't thrash the DB every
// 5 seconds.
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_CAP_MS = 5 * 60_000;
// Upper bound on how long one event's listeners may take before the row is
// treated as failed and retried. Without this, a listener that never settles
// would hold the advisory lock forever and silently stop the whole outbox.
const DISPATCH_TIMEOUT_MS = 30_000;

function toPayloadRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return Object.fromEntries(Object.entries(payload));
}

/**
 * Rejects with a timeout error when `promise` does not settle in time.
 *
 * The underlying dispatch is not cancelled — EventEmitter2 has no
 * cancellation — but the row stops blocking this tick and stays retryable,
 * which is the safe failure mode.
 */
function withDispatchTimeout(
  dispatch: Promise<unknown>,
  timeoutMs: number,
  rowId: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `listener dispatch exceeded ${timeoutMs}ms (outbox ${rowId})`,
        ),
      );
    }, timeoutMs);
    timer.unref?.();
    dispatch.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

@Injectable()
export class OutboxRelayScheduler {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly config: AppConfigService,
  ) {}

  private getBatchSize(): number {
    if (!this.config.isRlsEnabled()) return BATCH_SIZE;
    const poolMax = this.config.isProduction()
      ? DATABASE_CONSTANTS.POOL_MAX_PRODUCTION
      : DATABASE_CONSTANTS.POOL_MAX_DEVELOPMENT;
    // Each clinic dispatch holds a connection. Reserve one for the advisory
    // lock and one for acknowledgments rather than consuming retry attempts
    // on rows that cannot acquire a transaction from the same pool.
    return Math.min(BATCH_SIZE, Math.max(1, poolMax - 2));
  }

  private dispatchInTenantScope(
    clinicId: string | null,
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return runOutsideActiveTx(() => {
      const dispatch = () =>
        runWithTenant({ clinicId: clinicId ?? undefined }, async () => {
          await this.events.emitAsync(eventName, payload);
        });
      if (!clinicId || !this.config.isRlsEnabled()) return dispatch();

      // Workers have no request interceptor: bind every subscriber's queries
      // to a fresh connection carrying this row's database-level RLS scope.
      return this.prisma.$transaction(async (tx) => {
        await applyRlsScope(tx, clinicId);
        return runWithActiveTx(tx, dispatch);
      }, getRlsRequestTransactionOptions());
    });
  }

  @Cron(CRON_SCHEDULES.OUTBOX_RELAY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('outbox.relay')
  async drain(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const acquired = await withAdvisoryLock(
        this.prisma,
        'outbox-relay-drain',
        async () => {
          const now = new Date();
          const rows = await this.prisma.$queryRaw<
            Array<{
              id: string;
              event_name: string;
              payload: unknown;
              aggregate_id: string | null;
              clinic_id: string | null;
            }>
          >`
            WITH claimed AS (
              SELECT id
              FROM "OutboxEvent"
              WHERE "processedAt" IS NULL
                AND "attempts" < ${MAX_ATTEMPTS}
                AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now})
              ORDER BY "createdAt" ASC
              FOR UPDATE SKIP LOCKED
              LIMIT ${this.getBatchSize()}
            )
            UPDATE "OutboxEvent" o
            SET "attempts" = o."attempts" + 1,
                "lastAttemptAt" = ${now}
            FROM claimed
            WHERE o.id = claimed.id
            RETURNING o.id, o."eventName" AS event_name, o."payload",
                      o."aggregateId" AS aggregate_id, o."clinicId" AS clinic_id
          `;

          await Promise.allSettled(
            rows.map(async (row) => {
              try {
                if (!this.events.hasListeners(row.event_name)) {
                  throw new Error(
                    `No subscriber registered for ${row.event_name}`,
                  );
                }
                const payload = toPayloadRecord(row.payload);
                if (
                  payload.clinicId !== undefined &&
                  payload.clinicId !== row.clinic_id
                ) {
                  throw new Error(
                    'Outbox payload clinic does not match persisted clinic',
                  );
                }
                await withDispatchTimeout(
                  this.dispatchInTenantScope(row.clinic_id, row.event_name, {
                    ...payload,
                    __outboxId: row.id,
                    __aggregateId: row.aggregate_id,
                    __clinicId: row.clinic_id,
                  }),
                  DISPATCH_TIMEOUT_MS,
                  row.id,
                );
                // Acknowledgment happens only after every listener settled, so
                // a rejected listener leaves this row retryable instead of
                // marking a required effect as delivered.
                await this.prisma.outboxEvent.update({
                  where: { id: row.id },
                  data: {
                    processedAt: new Date(),
                    nextAttemptAt: null,
                    lastError: null,
                  },
                });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);
                const fresh = await this.prisma.outboxEvent.findUnique({
                  where: { id: row.id },
                  select: { attempts: true },
                });
                const attempts = fresh?.attempts ?? 1;
                const delay = Math.min(
                  BACKOFF_CAP_MS,
                  BACKOFF_BASE_MS * Math.pow(2, Math.min(attempts - 1, 10)),
                );
                await this.prisma.outboxEvent.update({
                  where: { id: row.id },
                  data: {
                    lastError: message.slice(0, 1000),
                    nextAttemptAt: new Date(Date.now() + delay),
                  },
                });
                this.logger.warn(
                  `[outbox-relay] dispatch failed for ${row.event_name} (id=${row.id}, attempts=${attempts}, next in ${delay}ms): ${message}`,
                );
                if (attempts >= MAX_ATTEMPTS) {
                  this.logger.error(
                    `[outbox-relay][DLQ] event ${row.event_name} (id=${row.id}) exhausted retries: ${message}`,
                  );
                }
              }
            }),
          );
        },
        DISPATCH_TIMEOUT_MS * 2,
      );

      if (acquired === null) {
        this.logger.warn(
          '[outbox-relay] skipping tick — another replica holds the advisory lock',
        );
      }
    } catch (error) {
      this.logger.error(
        `[outbox-relay] poll failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
