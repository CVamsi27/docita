import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getErrorMessage } from '@workspace/utils';
import { type DatabaseControlAction, Role } from '@workspace/db';
import { AuditAction } from '@/shared/modules/audit/audit.interface';
import type { Request } from 'express';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { DatabaseControlConfigService } from '@/shared/modules/config/database-control-config.service';
import { AuditLoggerService } from '@/shared/modules/audit/audit-logger.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { EnvironmentConfigService } from '@/shared/modules/config/environment-config.service';
import {
  DatabaseRdsService,
  type RdsInstanceSummary,
  type RdsSnapshotSummary,
} from '@/shared/modules/database/database-rds.service';
import {
  DatabaseControlStateRepository,
  type DatabaseControlActionType,
} from '@/shared/modules/database/database-control-state.repository';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

interface DatabaseControlState {
  enabled: boolean;
  environment: string;
  environmentAllowed: boolean;
  instance: RdsInstanceSummary | null;
  latestSnapshot: RdsSnapshotSummary | null;
  lastAction: Pick<
    DatabaseControlAction,
    | 'id'
    | 'action'
    | 'status'
    | 'actorEmail'
    | 'startedAt'
    | 'completedAt'
    | 'reason'
  > | null;
  cooldown: {
    action: DatabaseControlActionType;
    secondsRemaining: number;
  } | null;
}

interface ExecuteCommandInput {
  action: DatabaseControlActionType;
  reason: string;
  /** Required for RESTORE; must reference an existing snapshot id. */
  snapshotId?: string;
  /** Required for DELETE; must be the literal "DELETE-PROD-DB" (case-sensitive). */
  confirmation?: string;
}

export const DELETE_CONFIRMATION_PHRASE = 'DELETE-PROD-DB';
const MIN_REASON_LENGTH = 8;

/**
 * Orchestrates a single Database Control action end-to-end:
 *   1. Env gate (DATABASE_CONTROL_ENABLED, ALLOWED_ENV, AWS creds).
 *   2. Permission check (INTERNAL role + email allowlist via RolesGuard).
 *   3. Validation (confirmation phrase for DELETE, snapshotId for RESTORE,
 *      minimum reason length).
 *   4. Cooldown (60s after a Stop/Delete/Snapshot/Restore; never for Start).
 *   5. Write IN_PROGRESS row in DatabaseControlAction.
 *   6. Call the AWS SDK via DatabaseRdsService.
 *   7. Write the audit log row (AuditLoggerService).
 *   8. Send the email notification (EmailService).
 *   9. Update the DatabaseControlAction row to SUCCESS/FAILED.
 *
 * Steps 5-9 are best-effort around the actual AWS call: the AWS call
 * itself is synchronous in the request path, but RDS stop/start/delete/
 * restore are long-running (minutes). For those, the service writes
 * SUCCESS after the AWS SDK returns the accepted response, NOT after the
 * instance reaches the terminal state — the portal polls `getState()` to
 * follow the state machine.
 */
@Injectable()
export class DatabaseControlService {
  private readonly logger = new Logger(DatabaseControlService.name);

  constructor(
    private readonly config: DatabaseControlConfigService,
    private readonly environment: EnvironmentConfigService,
    private readonly rds: DatabaseRdsService,
    private readonly state: DatabaseControlStateRepository,
    private readonly audit: AuditLoggerService,
    private readonly email: EmailService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  // ── Read API ──────────────────────────────────────────────────────────────

  async getState(): Promise<DatabaseControlState> {
    const enabled = this.config.isEnabled();
    const env = this.environment.getEnvironment();
    const environmentAllowed = this.config.isCurrentEnvironmentAllowed(env);

    if (!enabled) {
      return {
        enabled: false,
        environment: env,
        environmentAllowed: false,
        instance: null,
        latestSnapshot: null,
        lastAction: null,
        cooldown: null,
      };
    }

    let instance: RdsInstanceSummary | null = null;
    let latestSnapshot: RdsSnapshotSummary | null = null;
    try {
      instance = await this.rds.describeInstance();
      const snaps = await this.rds.listRecentSnapshots(1);
      latestSnapshot = snaps[0] ?? null;
    } catch (error) {
      this.logger.error(
        `Failed to describe RDS state: ${getErrorMessage(error)}`,
      );
      // We still return the rest of the state — UI shows "unknown" for the
      // instance card rather than 500ing the whole page.
    }

    const lastActionRow = await this.state.findLastSuccessAction();
    const lastAction = lastActionRow
      ? {
          id: lastActionRow.id,
          action: lastActionRow.action,
          status: lastActionRow.status,
          actorEmail: lastActionRow.actorEmail,
          startedAt: lastActionRow.startedAt,
          completedAt: lastActionRow.completedAt,
          reason: lastActionRow.reason,
        }
      : null;

    const cooldown = await this.computeCooldown();

    return {
      enabled: true,
      environment: env,
      environmentAllowed,
      instance,
      latestSnapshot,
      lastAction,
      cooldown,
    };
  }

  async getHistory(limit = 30): Promise<DatabaseControlAction[]> {
    return this.state.findRecentHistory(limit);
  }

  // ── Write API ─────────────────────────────────────────────────────────────

  /**
   * Validates input + env + cooldown, then executes the requested action.
   * Returns the IN_PROGRESS DatabaseControlAction row id so the UI can
   * poll getState() and follow the lifecycle.
   */
  async execute(
    input: ExecuteCommandInput,
    user: AuthenticatedUser,
    request?: Request,
  ): Promise<{ actionId: string }> {
    this.assertEnabled();
    this.assertEnvironmentAllowed();
    this.assertValidInput(input);
    await this.assertCooldown(input.action);

    // 5. Record the start.
    const actionId = await this.state.recordStart({
      action: input.action,
      reason: input.reason,
      actorUserId: user.id,
      actorEmail: user.email,
      snapshotId: input.snapshotId,
    });

    // 6-9. Run the action. Any failure is recorded as FAILED + notified +
    // audited, but we rethrow so the controller returns 5xx and the UI
    // surfaces the error.
    try {
      const { requestId, snapshotId } = await this.runAction(input, actionId);

      const completedAt = this.clock.now();
      await this.state.recordCompletion(actionId, {
        id: actionId,
        status: 'SUCCESS',
        awsRequestId: requestId,
        completedAt,
        metadata: snapshotId ? { finalSnapshotId: snapshotId } : undefined,
      });

      await this.writeAudit({
        actionId,
        action: input.action,
        user,
        request,
        status: 'SUCCESS',
        awsRequestId: requestId,
        reason: input.reason,
        snapshotId,
      });

      await this.notify({
        action: input.action,
        actorEmail: user.email,
        reason: input.reason,
        snapshotId,
        status: 'SUCCESS',
      });

      return { actionId };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const completedAt = this.clock.now();
      await this.state.recordCompletion(actionId, {
        id: actionId,
        status: 'FAILED',
        errorMessage,
        completedAt,
      });

      await this.writeAudit({
        actionId,
        action: input.action,
        user,
        request,
        status: 'FAILURE',
        errorMessage,
        reason: input.reason,
      });

      await this.notify({
        action: input.action,
        actorEmail: user.email,
        reason: input.reason,
        status: 'FAILED',
        errorMessage,
      });

      this.logger.error(
        `Database control action ${input.action} failed for ${user.email}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException(
        `Database control action failed: ${errorMessage}`,
      );
    }
  }

  // ── Private: action runner ────────────────────────────────────────────────

  private async runAction(
    input: ExecuteCommandInput,
    actionId: string,
  ): Promise<{
    requestId: string | undefined;
    snapshotId: string | undefined;
  }> {
    /**
     * Long-running RDS transitions (stop/start/delete/restore) return the
     * accepted AWS request id synchronously but the actual instance state
     * change happens minutes later. The background `waitFor*` chain
     * follows that state machine and persists the terminal outcome back to
     * the `database_control_actions` row so the operator sees the real
     * status on the next `getState()` poll.
     */
    const trackBackgroundWait = (
      wait: Promise<unknown>,
      waitLabel: string,
    ): void => {
      void wait
        .then(() => {
          this.logger.log(
            `Background wait '${waitLabel}' completed for action ${actionId}`,
          );
          // The action row is already SUCCESS at the API level (the AWS
          // SDK accepted the request); we only persist a background failure
          // here. A successful background wait does not need a write.
        })
        .catch(async (err) => {
          const errorMessage = getErrorMessage(err);
          this.logger.error(
            `Background wait '${waitLabel}' failed for action ${actionId}: ${errorMessage}`,
          );
          try {
            await this.state.recordBackgroundCompletion(actionId, {
              status: 'FAILED',
              errorMessage,
              completedAt: this.clock.now(),
            });
          } catch (writeErr) {
            this.logger.error(
              `Failed to persist background failure for action ${actionId}: ${getErrorMessage(writeErr)}`,
            );
          }
        });
    };

    switch (input.action) {
      case 'CREATE_SNAPSHOT': {
        const snapshotId = this.rds.buildSnapshotId('manual');
        const { requestId } = await this.rds.requestCreateSnapshot(snapshotId);
        return { requestId, snapshotId };
      }
      case 'STOP': {
        const { requestId } = await this.rds.requestStop();
        trackBackgroundWait(this.rds.waitForStopped(), 'waitForStopped');
        return { requestId, snapshotId: undefined };
      }
      case 'START': {
        const { requestId } = await this.rds.requestStart();
        trackBackgroundWait(this.rds.waitForAvailable(), 'waitForAvailable');
        return { requestId, snapshotId: undefined };
      }
      case 'DELETE': {
        const finalSnapshotId = this.rds.buildSnapshotId('final');
        const { requestId } =
          await this.rds.requestDeleteWithFinalSnapshot(finalSnapshotId);
        trackBackgroundWait(
          this.rds.waitForInstanceDeleted(),
          'waitForInstanceDeleted',
        );
        return { requestId, snapshotId: finalSnapshotId };
      }
      case 'RESTORE': {
        if (!input.snapshotId) {
          throw new Error('RESTORE requires a snapshotId');
        }
        const { requestId } = await this.rds.requestRestoreFromSnapshot(
          input.snapshotId,
        );
        trackBackgroundWait(this.rds.waitForAvailable(), 'waitForAvailable');
        return { requestId, snapshotId: input.snapshotId };
      }
      default: {
        const exhaustive: never = input.action;
        throw new Error(`Unknown action: ${String(exhaustive)}`);
      }
    }
  }

  // ── Private: guards ───────────────────────────────────────────────────────

  private assertEnabled(): void {
    if (!this.config.isEnabled()) {
      throw new ForbiddenException(
        'Database Control is disabled. Set DATABASE_CONTROL_ENABLED=true to enable.',
      );
    }
  }

  private assertEnvironmentAllowed(): void {
    if (
      !this.config.isCurrentEnvironmentAllowed(
        this.environment.getEnvironment(),
      )
    ) {
      throw new ForbiddenException(
        `Database Control is not allowed in NODE_ENV=${this.environment.getEnvironment()}.`,
      );
    }
  }

  private assertValidInput(input: ExecuteCommandInput): void {
    if (!input.reason || input.reason.trim().length < MIN_REASON_LENGTH) {
      throw new ForbiddenException(
        `Reason is required and must be at least ${MIN_REASON_LENGTH} characters.`,
      );
    }
    if (input.action === 'DELETE') {
      if (input.confirmation !== DELETE_CONFIRMATION_PHRASE) {
        throw new ForbiddenException(
          `DELETE requires confirmation string "${DELETE_CONFIRMATION_PHRASE}".`,
        );
      }
    }
    if (input.action === 'RESTORE' && !input.snapshotId) {
      throw new ForbiddenException('RESTORE requires a snapshotId.');
    }
  }

  private async assertCooldown(
    action: DatabaseControlActionType,
  ): Promise<void> {
    if (action === 'START') return; // Start is never cooled down.
    const cooldownSecs = this.config.getCooldownSeconds();
    if (cooldownSecs <= 0) return;
    const lastTs = await this.state.findLastActionTimestamp(action);
    if (!lastTs) return;
    const elapsed = (this.clock.now().getTime() - lastTs.getTime()) / 1000;
    if (elapsed < cooldownSecs) {
      throw new ForbiddenException(
        `Cooldown active for ${action}. Retry in ${Math.ceil(cooldownSecs - elapsed)}s.`,
      );
    }
  }

  private async computeCooldown(): Promise<DatabaseControlState['cooldown']> {
    const cooldownSecs = this.config.getCooldownSeconds();
    if (cooldownSecs <= 0) return null;
    const actions: DatabaseControlActionType[] = [
      'STOP',
      'CREATE_SNAPSHOT',
      'DELETE',
      'RESTORE',
    ];
    for (const action of actions) {
      const lastTs = await this.state.findLastActionTimestamp(action);
      if (!lastTs) continue;
      const elapsed = (this.clock.now().getTime() - lastTs.getTime()) / 1000;
      if (elapsed < cooldownSecs) {
        return {
          action,
          secondsRemaining: Math.ceil(cooldownSecs - elapsed),
        };
      }
    }
    return null;
  }

  // ── Private: audit + notify ───────────────────────────────────────────────

  private async writeAudit(input: {
    actionId: string;
    action: DatabaseControlActionType;
    user: AuthenticatedUser;
    request?: Request;
    status: 'SUCCESS' | 'FAILURE';
    awsRequestId?: string;
    errorMessage?: string;
    reason: string;
    snapshotId?: string;
  }): Promise<void> {
    const forwardedFor = input.request?.headers['x-forwarded-for'];
    const ipAddress = input.request
      ? ((typeof forwardedFor === 'string' ? forwardedFor : undefined) ??
        input.request.ip)
      : undefined;
    const userAgentHeader = input.request?.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    await this.audit.log({
      action: AuditAction.SYSTEM_SETTING_CHANGED,
      userId: input.user.id,
      // Database control is a platform-level action — no clinic scope.
      clinicId: '',
      resourceType: 'rds_instance',
      resourceId: this.rds.getInstanceId(),
      status: input.status === 'SUCCESS' ? 'success' : 'failure',
      failureReason: input.errorMessage,
      ipAddress,
      userAgent,
      metadata: {
        actorEmail: input.user.email,
        databaseControlActionId: input.actionId,
        databaseControlAction: input.action,
        reason: input.reason,
        awsRequestId: input.awsRequestId ?? null,
        snapshotId: input.snapshotId ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  private async notify(input: {
    action: DatabaseControlActionType;
    actorEmail: string;
    reason: string;
    status: 'SUCCESS' | 'FAILED';
    snapshotId?: string;
    errorMessage?: string;
  }): Promise<void> {
    const to = this.config.getAlertEmail();
    if (!to) return; // Email is optional when feature is disabled; if unset, skip silently.
    const subject = `[${input.status}] Database Control: ${input.action} on ${this.rds.getInstanceId()}`;
    const lines = [
      `Action: ${input.action}`,
      `Status: ${input.status}`,
      `Instance: ${this.rds.getInstanceId()} (${this.rds.getRegion()})`,
      `Actor: ${input.actorEmail}`,
      `Reason: ${input.reason}`,
      input.snapshotId ? `Snapshot: ${input.snapshotId}` : null,
      input.errorMessage ? `Error: ${input.errorMessage}` : null,
      `Time: ${this.clock.now().toISOString()}`,
    ].filter(Boolean);
    try {
      await this.email.send({ to, subject, text: lines.join('\n') });
    } catch (error) {
      this.logger.error(
        `Failed to send database control notification: ${getErrorMessage(error)}`,
      );
    }
  }
}
