import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TelemetryCaptureState } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { toRouteCategoryBreakdown } from '@/shared/modules/monitoring/monitoring/rules/telemetry-observation.rules';
import {
  TELEMETRY_COVERAGE_NOTE,
  type TelemetryCoverage,
  type TelemetryCoverageState,
} from '@workspace/types';

/**
 * Durable evidence about whether request telemetry is actually capturing.
 *
 * Request and error logging are deliberately fail-soft: when persistence breaks
 * they switch themselves off rather than take the API down. Before this existed
 * that silence was indistinguishable from a quiet system, so a dashboard could
 * read the last retained rows and report them as current traffic with no signal
 * that the window was never observed.
 *
 * The DB write is itself best-effort and can fail for the same reason capture
 * stopped. Events therefore queue in memory and flush on the next successful
 * write, so a gap is never dropped just because the database was down when it
 * was discovered.
 */
@Injectable()
export class TelemetryCaptureRecorder {
  private readonly logger = new Logger(TelemetryCaptureRecorder.name);

  /**
   * Max events retained in memory while the database is unwritable. Bounded so
   * a long outage cannot turn the recorder into a leak; overflow is counted so
   * the loss is still visible in the totals.
   */
  private static readonly MAX_PENDING_EVENTS = 200;

  private pending: Array<{
    state: TelemetryCaptureState;
    reason: string;
    droppedRequests: number;
    bufferedRequests: number;
    recordedAt: Date;
  }> = [];

  private pendingDropped = 0;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Records that capture stopped. `droppedRequests` is what was already lost —
   * counting it is the whole point; an unrecorded gap is indistinguishable from
   * no traffic.
   */
  async recordDisabled(
    reason: string,
    droppedRequests: number,
    bufferedRequests: number,
  ): Promise<void> {
    await this.enqueue({
      state: TelemetryCaptureState.CAPTURE_DISABLED,
      reason,
      droppedRequests,
      bufferedRequests,
    });
  }

  /**
   * Records a buffer overflow. Distinct from DISABLED because capture is still
   * running: some rows were discarded to protect process memory.
   */
  async recordTruncated(
    reason: string,
    droppedRequests: number,
    bufferedRequests: number,
  ): Promise<void> {
    await this.enqueue({
      state: TelemetryCaptureState.CAPTURE_TRUNCATED,
      reason,
      droppedRequests,
      bufferedRequests,
    });
  }

  async recordRecovered(reason: string): Promise<void> {
    await this.enqueue({
      state: TelemetryCaptureState.CAPTURE_RECOVERED,
      reason,
      droppedRequests: 0,
      bufferedRequests: 0,
    });
  }

  /** Test/ops accessor for the number of events awaiting a successful write. */
  getPendingCount(): number {
    return this.pending.length;
  }

  getPendingDroppedCount(): number {
    return this.pendingDropped;
  }

  private async enqueue(event: {
    state: TelemetryCaptureState;
    reason: string;
    droppedRequests: number;
    bufferedRequests: number;
  }): Promise<void> {
    const row = { ...event, recordedAt: this.clock.now() };

    try {
      await this.write([row]);
      return;
    } catch (error) {
      this.logger.warn(
        `Could not persist telemetry capture event (${row.state}/${row.reason}): ${
          error instanceof Error ? error.message : String(error)
        }. Retained in memory for the next successful write.`,
      );
    }

    if (this.pending.length >= TelemetryCaptureRecorder.MAX_PENDING_EVENTS) {
      // Keep the totals honest even when the events themselves are dropped.
      this.pendingDropped += row.droppedRequests;
      return;
    }
    this.pending.push(row);
  }

  /**
   * Writes any events buffered while the database was unavailable. Call after
   * a successful telemetry write.
   */
  async flushPending(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.write(batch);
    } catch (error) {
      this.pending = [...batch, ...this.pending].slice(
        0,
        TelemetryCaptureRecorder.MAX_PENDING_EVENTS,
      );
      this.logger.warn(
        `Deferred telemetry capture events could not be written: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async write(
    events: Array<{
      state: TelemetryCaptureState;
      reason: string;
      droppedRequests: number;
      bufferedRequests: number;
      recordedAt: Date;
    }>,
  ): Promise<void> {
    // RLS-BYPASS: platform telemetry health, not clinic-scoped
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.telemetryCaptureEvent.createMany({ data: events });
    });
  }

  /**
   * Summarizes what the retained window can honestly support.
   *
   * UNAVAILABLE when the last retained row predates the window (capture was off
   * for all of it), GAPS_RECORDED when rows exist but drops were recorded,
   * COMPLETE otherwise.
   */
  async getCoverage(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<TelemetryCoverage> {
    const [first, last, inWindow, byCategory, invalid, captureEvents] =
      await Promise.all([
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.apiRequest.findFirst({
            orderBy: { observedAt: 'asc' },
            select: { observedAt: true },
          }),
        ),
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.apiRequest.findFirst({
            orderBy: { observedAt: 'desc' },
            select: { observedAt: true },
          }),
        ),
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.apiRequest.count({
            where: { observedAt: { gte: windowStart, lte: windowEnd } },
          }),
        ),
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.apiRequest.groupBy({
            by: ['routeCategory'],
            where: { observedAt: { gte: windowStart, lte: windowEnd } },
            _count: { id: true },
          }),
        ),
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.apiRequest.count({
            where: {
              observedAt: { gte: windowStart, lte: windowEnd },
              latencyValid: false,
            },
          }),
        ),
        // RLS-BYPASS: platform telemetry health, not clinic-scoped
        this.prisma.runUnrestricted(async () =>
          this.prisma.telemetryCaptureEvent.findMany({
            where: { recordedAt: { gte: windowStart, lte: windowEnd } },
            select: {
              state: true,
              reason: true,
              droppedRequests: true,
              bufferedRequests: true,
              recordedAt: true,
            },
            orderBy: { recordedAt: 'asc' },
            take: 100,
          }),
        ),
      ]);

    const events = captureEvents.map((event) => ({
      state: event.state,
      reason: event.reason,
      droppedRequests: event.droppedRequests,
      bufferedRequests: event.bufferedRequests,
      recordedAt: event.recordedAt.toISOString(),
    }));

    const droppedRequests =
      events.reduce((total, event) => total + event.droppedRequests, 0) +
      this.pendingDropped;

    const breakdown = toRouteCategoryBreakdown(byCategory);

    const lastObservedAt = last?.observedAt ?? null;
    const state = resolveCoverageState({
      lastObservedAt,
      windowStart,
      droppedRequests,
      retainedRequests: inWindow,
    });

    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      state,
      firstObservedAt: first?.observedAt.toISOString() ?? null,
      lastObservedAt: lastObservedAt?.toISOString() ?? null,
      retainedRequests: inWindow,
      byRouteCategory: breakdown,
      invalidLatencySamples: invalid,
      captureEvents: events,
      droppedRequests,
      coverageNote: TELEMETRY_COVERAGE_NOTE,
    };
  }
}

/**
 * Exported for direct unit testing: coverage state is a pure function of what
 * was retained and what was recorded as lost.
 */
export function resolveCoverageState(input: {
  lastObservedAt: Date | null;
  windowStart: Date;
  droppedRequests: number;
  retainedRequests: number;
}): TelemetryCoverageState {
  if (input.lastObservedAt === null) {
    return 'UNAVAILABLE';
  }
  // Nothing retained inside the window, and nothing retained since it opened:
  // capture was off for the whole window.
  if (
    input.retainedRequests === 0 &&
    input.lastObservedAt.getTime() < input.windowStart.getTime()
  ) {
    return 'UNAVAILABLE';
  }
  return input.droppedRequests > 0 ? 'GAPS_RECORDED' : 'COMPLETE';
}
