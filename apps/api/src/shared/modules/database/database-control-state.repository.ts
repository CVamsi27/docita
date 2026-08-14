import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type DatabaseControlAction } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

export type DatabaseControlActionType =
  | 'STOP'
  | 'START'
  | 'CREATE_SNAPSHOT'
  | 'DELETE'
  | 'RESTORE';

type DatabaseControlActionStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

interface NewDatabaseControlAction {
  action: DatabaseControlActionType;
  reason: string;
  actorUserId: string;
  actorEmail: string;
  snapshotId?: string;
}

interface CompletedDatabaseControlAction {
  id: string;
  status: DatabaseControlActionStatus;
  awsRequestId?: string;
  errorMessage?: string;
  completedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Thin Prisma wrapper for the `database_control_actions` table. Two
 * responsibilities:
 *   1. Write the IN_PROGRESS row at action start, so the UI can poll it
 *      immediately and render the action as "running".
 *   2. Append the final SUCCESS/FAILED row update when the AWS call
 *      completes (or throws).
 *
 * Also exposes cooldown + history queries used by the service layer.
 */
@Injectable()
export class DatabaseControlStateRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /** Insert an IN_PROGRESS row and return the generated id. */
  async recordStart(input: NewDatabaseControlAction): Promise<string> {
    const row = await this.prisma.databaseControlAction.create({
      data: {
        action: input.action,
        status: 'IN_PROGRESS',
        reason: input.reason,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        snapshotId: input.snapshotId ?? null,
        startedAt: this.clock.now(),
      },
      select: { id: true },
    });
    return row.id;
  }

  async recordCompletion(
    id: string,
    completion: CompletedDatabaseControlAction,
  ): Promise<void> {
    await this.prisma.databaseControlAction.update({
      where: { id },
      data: {
        status: completion.status,
        awsRequestId: completion.awsRequestId ?? null,
        errorMessage: completion.errorMessage ?? null,
        completedAt: completion.completedAt,
        metadata: completion.metadata
          ? toPrismaInputJsonValue(completion.metadata)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Update the `errorMessage` and `completedAt` columns on a row that has
   * already been written by `recordCompletion` (or `recordStart` for a
   * still-IN_PROGRESS action that failed in the background wait). Used by
   * the background `waitFor*` chains in DatabaseControlService so the
   * UI's getState() poll reflects the real terminal state once the RDS
   * instance finishes its lifecycle.
   *
   * No-op when `id` no longer exists (e.g. the row was deleted between
   * the action starting and the background wait completing) — the
   * background chain must not throw on a missing row.
   */
  async recordBackgroundCompletion(
    id: string,
    completion: {
      status: 'SUCCESS' | 'FAILED';
      errorMessage?: string;
      completedAt: Date;
    },
  ): Promise<void> {
    try {
      await this.prisma.databaseControlAction.update({
        where: { id },
        data: {
          status: completion.status,
          errorMessage: completion.errorMessage ?? null,
          completedAt: completion.completedAt,
        },
      });
    } catch (error) {
      // P2025 = "Record to update not found" — the action row was
      // removed between start and background completion (e.g. a manual
      // cleanup). Swallow so the background chain does not surface an
      // unhandled rejection to the process exit handler.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }

  /**
   * Returns the timestamp of the most recent IN_PROGRESS or SUCCESS row of
   * the given action type, used to enforce the cooldown window. Returns
   * null if there is no recent action.
   */
  async findLastActionTimestamp(
    action: DatabaseControlActionType,
  ): Promise<Date | null> {
    const row = await this.prisma.databaseControlAction.findFirst({
      where: {
        action,
        status: { in: ['IN_PROGRESS', 'SUCCESS'] },
      },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });
    return row?.startedAt ?? null;
  }

  /**
   * Returns the most recent SUCCESS action overall — used to render the
   * "Last action: ..." pill on the portal page.
   */
  async findLastSuccessAction(): Promise<DatabaseControlAction | null> {
    return this.prisma.databaseControlAction.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
    });
  }

  /** Returns the last `limit` actions, newest first. */
  async findRecentHistory(limit = 30): Promise<DatabaseControlAction[]> {
    return this.prisma.databaseControlAction.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
