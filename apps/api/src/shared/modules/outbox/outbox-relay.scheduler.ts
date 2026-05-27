/**
 * Transactional outbox relay.
 *
 * Drains unprocessed `OutboxEvent` rows by republishing each payload through
 * the in-process `EventEmitter2` and marking the row `processedAt`. Failures
 * increment `attempts` and store the last error message; rows past the
 * retry ceiling are left in place for the DLQ alerting path.
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

const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 8;
// Exponential backoff: don't retry rows that just failed. nextAttemptAt is
// derived from `attempts` so a transient error doesn't thrash the DB every
// 5 seconds.
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_CAP_MS = 5 * 60_000;

function toPayloadRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return Object.fromEntries(Object.entries(payload));
}

@Injectable()
export class OutboxRelayScheduler {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron(CRON_SCHEDULES.OUTBOX_RELAY, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('outbox.relay')
  async drain(): Promise<void> {
    // Avoid overlapping runs if a previous tick is still draining a large
    // backlog. A future iteration can swap this in-process guard for a
    // Postgres advisory lock once we need cross-pod leader election.
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      // Atomic claim of a batch via UPDATE ... RETURNING. This is the
      // Postgres-portable equivalent of SELECT FOR UPDATE SKIP LOCKED and
      // makes the relay safe to run on multiple replicas: each replica claims
      // a disjoint set of rows. The CTE filters by attempts/backoff and
      // marks the rows as in-flight by bumping attempts. A row that
      // dispatches successfully is then finalized with processedAt; one that
      // fails is left with the incremented attempts (and its lastError set).
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
          LIMIT ${BATCH_SIZE}
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
            this.events.emit(row.event_name, {
              ...toPayloadRecord(row.payload),
              __outboxId: row.id,
              __aggregateId: row.aggregate_id,
              __clinicId: row.clinic_id,
            });
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
            // Exponential backoff: 2^attempts * base, capped. attempts was
            // already incremented by the claim step, so use it as-is.
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
              // DLQ landmark: surface to ops via the heartbeat / alerting path.
              this.logger.error(
                `[outbox-relay][DLQ] event ${row.event_name} (id=${row.id}) exhausted retries: ${message}`,
              );
            }
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `[outbox-relay] poll failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
