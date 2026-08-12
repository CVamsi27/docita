/**
 * Cron-heartbeat decorator + service interface.
 *
 * Every scheduled job in the codebase must record a heartbeat on
 * success and failure so we can answer "did the scheduler that does
 * X actually run yesterday?" — a question that today requires
 * grepping logs and is therefore answered with "probably."
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 36. The `CronHeartbeat`
 * Prisma model and `PrismaCronHeartbeatService` persist status, while
 * `scripts/checks/check-cron-heartbeat-coverage.mjs` enforces that every
 * `@Cron` handler carries a unique `@TrackHeartbeat("<name>")`.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import 'reflect-metadata';
import { PrismaService } from '@/prisma/prisma.service';
import { Gauge, register } from 'prom-client';

const CRON_HEARTBEAT_KEY = Symbol('CRON_HEARTBEAT_NAME');

export interface ICronHeartbeatService {
  recordSuccess(name: string): Promise<void>;
  recordFailure(name: string, error: unknown): Promise<void>;
}

@Injectable()
class NoopCronHeartbeatService implements ICronHeartbeatService {
  async recordSuccess(_name: string): Promise<void> {
    /* no-op for tests */
  }
  async recordFailure(_name: string, _error: unknown): Promise<void> {
    /* no-op for tests */
  }
}

const noopCronHeartbeatService = new NoopCronHeartbeatService();
let activeCronHeartbeatService: ICronHeartbeatService =
  noopCronHeartbeatService;

export function registerCronHeartbeatService(
  service: ICronHeartbeatService,
): () => void {
  activeCronHeartbeatService = service;
  return () => {
    if (activeCronHeartbeatService === service) {
      activeCronHeartbeatService = noopCronHeartbeatService;
    }
  };
}

/**
 * Persistent heartbeat backed by the `CronHeartbeat` Prisma model. Each
 * successful or failed scheduler run upserts a row keyed by `name` so
 * dashboards / `scripts/checks/check-cron-heartbeat-coverage.mjs` can
 * answer "did the X scheduler run in the last Y minutes".
 */
@Injectable()
export class PrismaCronHeartbeatService
  implements ICronHeartbeatService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaCronHeartbeatService.name);
  private unregister?: () => void;
  private readonly heartbeatStalenessGauge: Gauge<string>;

  constructor(private readonly prisma: PrismaService) {
    const existing = register.getSingleMetric(
      'cron_heartbeat_staleness_seconds',
    );
    this.heartbeatStalenessGauge =
      existing instanceof Gauge
        ? existing
        : new Gauge({
            name: 'cron_heartbeat_staleness_seconds',
            help: 'Seconds since last successful cron heartbeat, by job name',
            labelNames: ['job_name', 'status'],
          });
  }

  onModuleInit(): void {
    this.unregister = registerCronHeartbeatService(this);
  }

  onModuleDestroy(): void {
    this.unregister?.();
  }

  async recordSuccess(name: string): Promise<void> {
    try {
      await this.prisma.cronHeartbeat.upsert({
        where: { name },
        create: { name, lastRunAt: new Date(), lastStatus: 'SUCCESS' },
        update: {
          lastRunAt: new Date(),
          lastStatus: 'SUCCESS',
          lastError: null,
        },
      });
      this.heartbeatStalenessGauge.set(
        { job_name: name, status: 'SUCCESS' },
        0,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record cron heartbeat success for ${name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async recordFailure(name: string, error: unknown): Promise<void> {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    try {
      await this.prisma.cronHeartbeat.upsert({
        where: { name },
        create: {
          name,
          lastRunAt: new Date(),
          lastStatus: 'FAILURE',
          lastError: message.slice(0, 1000),
        },
        update: {
          lastRunAt: new Date(),
          lastStatus: 'FAILURE',
          lastError: message.slice(0, 1000),
        },
      });
      this.heartbeatStalenessGauge.set(
        { job_name: name, status: 'FAILURE' },
        0,
      );
    } catch (writeError) {
      this.logger.warn(
        `Failed to record cron heartbeat failure for ${name}: ${
          writeError instanceof Error ? writeError.message : String(writeError)
        }`,
      );
    }
  }

  async getStaleJobs(
    thresholdSeconds: number,
  ): Promise<Array<{ name: string; lastRunAt: Date; lastStatus: string }>> {
    try {
      const threshold = new Date(Date.now() - thresholdSeconds * 1000);
      return await this.prisma.cronHeartbeat.findMany({
        where: { lastRunAt: { lt: threshold } },
        select: { name: true, lastRunAt: true, lastStatus: true },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to query stale cron jobs: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}

/**
 * Decorator. Annotates a scheduler method with the heartbeat name and wraps
 * execution so success and failure are persisted by the worker-scoped recorder.
 *
 * Example:
 *   @Cron(CRON_SCHEDULES.REMINDER_HOURLY)
 *   @TrackHeartbeat("billing.reconcile")
 *   async run() { ... }
 */
type SchedulerMethod = (...args: unknown[]) => unknown;

function isSchedulerMethod(value: unknown): value is SchedulerMethod {
  return typeof value === 'function';
}

export function TrackHeartbeat(name: string) {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(CRON_HEARTBEAT_KEY, name, target, propertyKey);
    const original: unknown = descriptor.value;
    if (!isSchedulerMethod(original)) {
      return;
    }

    descriptor.value = async function (...args: unknown[]) {
      try {
        const result = await original.apply(this, args);
        await activeCronHeartbeatService.recordSuccess(name);
        return result;
      } catch (error) {
        await activeCronHeartbeatService.recordFailure(name, error);
        throw error;
      }
    };
  };
}

export function getHeartbeatName(
  target: object,
  propertyKey: string | symbol,
): string | undefined {
  return Reflect.getMetadata(CRON_HEARTBEAT_KEY, target, propertyKey);
}
