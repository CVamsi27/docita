import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { PoolSaturationSnapshot } from '@workspace/db';

interface SaturationSample extends PoolSaturationSnapshot {
  at: Date;
}

/** Samples retained in memory. Roughly `SAMPLE_INTERVAL_MS * MAX_SAMPLES`. */
const MAX_SAMPLES = 120;
const SAMPLE_INTERVAL_MS = 30_000;
/**
 * How long callers must stay queued before it is worth waking someone.
 *
 * A queue that drains is normal burst behaviour and is not an incident. Two
 * consecutive samples is deliberate: at 30s sampling, one sample cannot tell a
 * brief spike from a queue that is not moving, and the point of this signal is
 * to distinguish them.
 */
const SATURATION_ALERT_THRESHOLD_MS = SAMPLE_INTERVAL_MS * 2;

/**
 * Time-series of pool saturation for one replica.
 *
 * `PoolSaturationSnapshot` answers "is the pool saturated right now", which is
 * the wrong question for capacity planning: a queue that fills once during a
 * deploy is noise, while a queue that never empties is a limit that must move.
 * Each replica keeps its own bounded window, so a deploy or scale event shows up
 * as a discontinuity between replicas rather than being averaged away.
 *
 * Sampling-based like the rest of this surface: no per-query cost. In memory by
 * design — a restart losing the window is preferable to adding a write path to
 * the database this is measuring.
 */
@Injectable()
export class PoolSaturationHistoryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PoolSaturationHistoryService.name);
  private samples: SaturationSample[] = [];
  private timer: NodeJS.Timeout | null = null;
  private alertedForCurrentEpisode = false;

  constructor(
    private prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  onModuleInit(): void {
    this.sample();
    this.timer = setInterval(() => this.sample(), SAMPLE_INTERVAL_MS);
    // Never hold the process open: e2e suites and CLI scripts close the app
    // without waiting out the interval.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private sample(): void {
    try {
      const snapshot = this.prisma.getPoolSaturation();
      const at = this.clock.now();
      this.samples.push({ ...snapshot, at });
      if (this.samples.length > MAX_SAMPLES) this.samples.shift();
      this.alertOnSustainedSaturation(snapshot);
    } catch (error) {
      // Sampling must never take down startup; an unavailable pool is already
      // visible on the live endpoint and in request failures.
      this.logger.warn(
        `Pool saturation sample failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  /**
   * Warns once per saturation episode. Re-alerting every sample would bury the
   * signal in the log during exactly the incident it describes; re-arming on
   * drain means the next episode is reported again.
   */
  private alertOnSustainedSaturation(snapshot: PoolSaturationSnapshot): void {
    if (!snapshot.saturated) {
      this.alertedForCurrentEpisode = false;
      return;
    }
    const queuedForMs = snapshot.queuedForMs ?? 0;
    if (
      this.alertedForCurrentEpisode ||
      queuedForMs < SATURATION_ALERT_THRESHOLD_MS
    ) {
      return;
    }

    this.alertedForCurrentEpisode = true;
    const message =
      `Database connection pool saturated for ${queuedForMs}ms ` +
      `(waiting=${snapshot.waiting} total=${snapshot.total} max=${snapshot.max}). ` +
      `Requests are waiting for a connection, not for the database.`;
    // Always logged: the webhook below is a no-op when no alert URL is
    // configured, and a saturated pool must not depend on configuration to be
    // visible.
    this.logger.warn(message);
    this.events.emit(ApplicationEvents.POOL_SATURATION_SUSTAINED, {
      queuedForMs,
      waiting: snapshot.waiting,
      total: snapshot.total,
      max: snapshot.max,
    });
  }

  getHistory(): {
    sampleIntervalMs: number;
    sampleCount: number;
    windowMs: number | null;
    samples: SaturationSample[];
    summary: {
      maxWaiting: number;
      maxTotal: number;
      maxQueuedForMs: number;
      saturatedSamples: number;
      longestSaturationRunMs: number;
    };
  } {
    const saturatedSamples = this.samples.filter((s) => s.saturated);
    const windowMs =
      this.samples.length < 2
        ? null
        : this.samples[this.samples.length - 1].at.getTime() -
          this.samples[0].at.getTime();

    return {
      sampleIntervalMs: SAMPLE_INTERVAL_MS,
      sampleCount: this.samples.length,
      windowMs,
      samples: [...this.samples],
      summary: {
        maxWaiting: this.samples.reduce(
          (max, s) => Math.max(max, s.waiting),
          0,
        ),
        maxTotal: this.samples.reduce((max, s) => Math.max(max, s.total), 0),
        maxQueuedForMs: this.samples.reduce(
          (max, s) => Math.max(max, s.queuedForMs ?? 0),
          0,
        ),
        saturatedSamples: saturatedSamples.length,
        longestSaturationRunMs: this.longestSaturationRunMs(),
      },
    };
  }

  /** Longest unbroken stretch of consecutive saturated samples. */
  private longestSaturationRunMs(): number {
    let longest = 0;
    let runStart: number | null = null;
    let previousAt: number | null = null;

    for (const sample of this.samples) {
      const at = sample.at.getTime();
      if (sample.saturated) {
        runStart ??= previousAt ?? at;
        longest = Math.max(longest, at - runStart);
      } else {
        runStart = null;
      }
      previousAt = at;
    }
    return longest;
  }

  clearHistory(): void {
    this.samples = [];
    this.logger.log('Pool saturation history cleared');
  }
}
