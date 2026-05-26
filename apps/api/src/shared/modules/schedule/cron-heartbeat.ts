/**
 * Cron-heartbeat decorator + service interface.
 *
 * Every scheduled job in the codebase must record a heartbeat on
 * success and failure so we can answer "did the scheduler that does
 * X actually run yesterday?" — a question that today requires
 * grepping logs and is therefore answered with "probably."
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 36.
 *
 * Wiring TODO:
 *   - Add a `CronHeartbeat` model to Prisma:
 *       model CronHeartbeat {
 *         id          String   @id @default(cuid())
 *         name        String   @unique
 *         lastRunAt   DateTime
 *         lastStatus  CronHeartbeatStatus
 *         lastError   String?
 *         createdAt   DateTime @default(now())
 *         updatedAt   DateTime @updatedAt
 *       }
 *       enum CronHeartbeatStatus { SUCCESS FAILURE }
 *   - Implement `PrismaCronHeartbeatService` that upserts on call.
 *   - Apply `@TrackHeartbeat("<name>")` to every scheduler method.
 *   - `scripts/checks/check-cron-heartbeat-coverage.mjs` (added below)
 *     enforces coverage.
 *
 * This file ships the decorator + interface so call sites can adopt
 * the annotation now; the underlying service is a no-op until the
 * Prisma model lands.
 */
import { Injectable } from '@nestjs/common';
import 'reflect-metadata';

export const CRON_HEARTBEAT_KEY = Symbol('CRON_HEARTBEAT_NAME');

export interface ICronHeartbeatService {
  recordSuccess(name: string): Promise<void>;
  recordFailure(name: string, error: unknown): Promise<void>;
}

@Injectable()
export class NoopCronHeartbeatService implements ICronHeartbeatService {
  async recordSuccess(_name: string): Promise<void> {
    /* no-op until Prisma model lands */
  }
  async recordFailure(_name: string, _error: unknown): Promise<void> {
    /* no-op until Prisma model lands */
  }
}

/**
 * Decorator. Annotates a scheduler method with the heartbeat name.
 * The actual recording is performed by a NestJS interceptor that
 * reads the metadata (added when the Prisma model is provisioned).
 *
 * Example:
 *   @Cron(CRON_SCHEDULES.REMINDER_HOURLY)
 *   @TrackHeartbeat("billing.reconcile")
 *   async run() { ... }
 */
export function TrackHeartbeat(name: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(
      CRON_HEARTBEAT_KEY,
      name,
      target,
      propertyKey as string | symbol,
    );
  };
}

export function getHeartbeatName(
  target: object,
  propertyKey: string | symbol,
): string | undefined {
  return Reflect.getMetadata(CRON_HEARTBEAT_KEY, target, propertyKey);
}
