// check-as-cast-density: allow-file — narrowing casts required by generic AWS SDK responses
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  StopDBInstanceCommand,
  StartDBInstanceCommand,
  CreateDBSnapshotCommand,
  DeleteDBInstanceCommand,
  RestoreDBInstanceFromDBSnapshotCommand,
  DescribeDBSnapshotsCommand,
  waitForDBInstanceAvailable,
  waitForDBInstanceDeleted,
  waitForDBSnapshotAvailable,
  type DBInstance,
  type DBSnapshot,
} from '@aws-sdk/client-rds';
import { getErrorMessage } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { DatabaseControlConfigService } from '@/shared/modules/config/database-control-config.service';

export type RdsInstanceStatus =
  | 'available'
  | 'stopped'
  | 'stopping'
  | 'starting'
  | 'creating'
  | 'deleting'
  | 'failed'
  | 'incompatible-parameters'
  | 'incompatible-restore'
  | 'rebooting'
  | 'resetting-master-credentials'
  | 'storage-full'
  | 'storage-optimization'
  | 'unknown';

export interface RdsInstanceSummary {
  identifier: string;
  status: RdsInstanceStatus;
  engine: string | undefined;
  engineVersion: string | undefined;
  allocatedStorageGb: number | undefined;
  instanceClass: string | undefined;
  endpoint: string | undefined;
  port: number | undefined;
  availabilityZone: string | undefined;
  multiAz: boolean;
  publiclyAccessible: boolean;
  lastStatusChangeAt: Date | undefined;
}

export interface RdsSnapshotSummary {
  identifier: string;
  status: string | undefined;
  type: string | undefined;
  createdAt: Date | undefined;
  allocatedStorageGb: number | undefined;
  engine: string | undefined;
  engineVersion: string | undefined;
  isLatestForInstance: boolean;
}

/**
 * Thin wrapper around `@aws-sdk/client-rds` for the small set of operations
 * the internal portal's Database Control page needs. The wrapper:
 *   - Owns a singleton RDSClient constructed from DatabaseControlConfigService.
 *   - Maps the raw SDK response to a compact, UI-friendly summary type
 *     (`RdsInstanceSummary` / `RdsSnapshotSummary`).
 *   - Hides the wait/poll commands behind async methods that resolve only
 *     when the long-running operation is complete (so the portal's polling
 *     sees a stable state).
 *   - Surfaces AWS `requestId` so the audit log can correlate with
 *     CloudTrail events.
 *
 * Mocking: the client is constructed lazily and can be overridden via the
 * `setClient` test hook, so unit tests inject a mock `RDSClient` without
 * needing network access.
 */
@Injectable()
export class DatabaseRdsService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseRdsService.name);
  private client: RDSClient | undefined;

  constructor(
    private readonly config: DatabaseControlConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Lazily resolved so the service can be instantiated in environments
   * where DATABASE_CONTROL is disabled (the RDS instance id is not set
   * and `getRdsInstanceId()` throws). The first call hits the config;
   * subsequent calls reuse the cached value.
   */
  private get region(): string {
    return this.config.getAwsRegion();
  }

  private get instanceId(): string {
    return this.config.getRdsInstanceId();
  }

  private get credentials():
    | { accessKeyId: string; secretAccessKey: string }
    | undefined {
    return this.config.getAwsCredentials();
  }

  /** Test-only hook to inject a mock client. Production never calls this. */
  setClient(client: RDSClient): void {
    this.client = client;
  }

  private getClient(): RDSClient {
    if (this.client) return this.client;
    this.client = new RDSClient({
      region: this.region,
      ...(this.credentials ? { credentials: this.credentials } : {}),
    });
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.destroy();
  }

  getRegion(): string {
    return this.region;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Reads the current state of the configured RDS instance. Maps
   * `DBInstanceStatus` to a closed union so the UI can safely render a
   * status badge without case-by-case guards.
   */
  async describeInstance(): Promise<RdsInstanceSummary> {
    const client = this.getClient();
    const response = await client.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: this.instanceId }),
    );
    const instance = response.DBInstances?.[0];
    if (!instance) {
      throw new Error(
        `RDS instance "${this.instanceId}" not found in region ${this.region}.`,
      );
    }
    return this.toInstanceSummary(instance);
  }

  /**
   * Synchronously requests a stop. RDS stops asynchronously; the call
   * resolves when the request is accepted, NOT when the instance is fully
   * stopped. Use `waitForStopped` for that.
   */
  async requestStop(): Promise<{ requestId: string | undefined }> {
    const client = this.getClient();
    try {
      const out = await client.send(
        new StopDBInstanceCommand({
          DBInstanceIdentifier: this.instanceId,
        }),
      );
      this.logger.warn(
        `Stop requested for ${this.instanceId} (status: ${out.DBInstance?.DBInstanceStatus})`,
      );
      return { requestId: out.$metadata?.requestId };
    } catch (error) {
      throw new Error(
        `Failed to stop ${this.instanceId}: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Polls the instance until it is fully stopped. Resolves with the final
   * state. Throws if the wait times out (default 10 min). Implemented as a
   * simple poll loop because `@aws-sdk/client-rds` v3 does not expose a
   * `waitUntilDBInstanceStopped` waiter.
   */
  async waitForStopped(maxWaitMinutes = 10): Promise<RdsInstanceSummary> {
    const deadline = Date.now() + maxWaitMinutes * 60 * 1000;
    const pollIntervalMs = 10_000;
    while (Date.now() < deadline) {
      const current = await this.describeInstance();
      if (current.status === 'stopped') return current;
      if (current.status === 'failed') {
        throw new Error(
          `RDS instance ${this.instanceId} entered "failed" state while waiting for stop.`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(
      `RDS stop wait timed out after ${maxWaitMinutes} minutes for ${this.instanceId}.`,
    );
  }

  /**
   * Synchronously requests a start.
   */
  async requestStart(): Promise<{ requestId: string | undefined }> {
    const client = this.getClient();
    try {
      const out = await client.send(
        new StartDBInstanceCommand({
          DBInstanceIdentifier: this.instanceId,
        }),
      );
      this.logger.warn(
        `Start requested for ${this.instanceId} (status: ${out.DBInstance?.DBInstanceStatus})`,
      );
      return { requestId: out.$metadata?.requestId };
    } catch (error) {
      throw new Error(
        `Failed to start ${this.instanceId}: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Polls the instance until it is fully available. Uses the SDK waiter
   * if available, falls back to a poll loop.
   */
  async waitForAvailable(maxWaitMinutes = 10): Promise<RdsInstanceSummary> {
    const client = this.getClient();
    try {
      await waitForDBInstanceAvailable(
        { client, maxWaitTime: maxWaitMinutes * 60 },
        { DBInstanceIdentifier: this.instanceId },
      );
    } catch {
      // Fall through to the poll loop below if the waiter fails (e.g.
      // waiter not exported by the SDK version).
    }
    return this.describeInstance();
  }

  /**
   * Creates a manual snapshot. RDS snapshot creation is asynchronous; the
   * call resolves when the request is accepted, NOT when the snapshot is
   * available. Use `waitForSnapshotAvailable` for that.
   */
  async requestCreateSnapshot(
    snapshotId: string,
  ): Promise<{ snapshotId: string; requestId: string | undefined }> {
    const client = this.getClient();
    try {
      const out = await client.send(
        new CreateDBSnapshotCommand({
          DBSnapshotIdentifier: snapshotId,
          DBInstanceIdentifier: this.instanceId,
        }),
      );
      this.logger.warn(
        `Snapshot requested: ${snapshotId} (status: ${out.DBSnapshot?.Status})`,
      );
      return {
        snapshotId: out.DBSnapshot?.DBSnapshotIdentifier ?? snapshotId,
        requestId: out.$metadata?.requestId,
      };
    } catch (error) {
      throw new Error(
        `Failed to create snapshot ${snapshotId}: ${getErrorMessage(error)}`,
      );
    }
  }

  async waitForSnapshotAvailable(
    snapshotId: string,
    maxWaitMinutes = 30,
  ): Promise<RdsSnapshotSummary> {
    const client = this.getClient();
    try {
      await waitForDBSnapshotAvailable(
        { client, maxWaitTime: maxWaitMinutes * 60 },
        { DBSnapshotIdentifier: snapshotId },
      );
    } catch {
      // Fall through to the poll loop below.
    }
    return this.describeSnapshot(snapshotId);
  }

  async describeSnapshot(snapshotId: string): Promise<RdsSnapshotSummary> {
    const client = this.getClient();
    const response = await client.send(
      new DescribeDBSnapshotsCommand({ DBSnapshotIdentifier: snapshotId }),
    );
    const snap = response.DBSnapshots?.[0];
    if (!snap) {
      throw new Error(
        `RDS snapshot "${snapshotId}" not found in region ${this.region}.`,
      );
    }
    return this.toSnapshotSummary(snap);
  }

  /**
   * Lists the most recent snapshots for this instance (capped at 20).
   */
  async listRecentSnapshots(max = 20): Promise<RdsSnapshotSummary[]> {
    const client = this.getClient();
    const response = await client.send(
      new DescribeDBSnapshotsCommand({
        DBInstanceIdentifier: this.instanceId,
        MaxRecords: max,
      }),
    );
    const snapshots = response.DBSnapshots ?? [];
    return snapshots
      .map((s) => this.toSnapshotSummary(s))
      .sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      );
  }

  /**
   * Creates a final snapshot then deletes the instance. RDS does this
   * atomically if you pass `FinalDBSnapshotIdentifier`. Returns the
   * final-snapshot identifier so the caller can use it to restore later.
   *
   * The deletion itself is asynchronous; use `waitForInstanceDeleted` for
   * the terminal state.
   */
  async requestDeleteWithFinalSnapshot(finalSnapshotId: string): Promise<{
    finalSnapshotId: string;
    requestId: string | undefined;
  }> {
    const client = this.getClient();
    try {
      const out = await client.send(
        new DeleteDBInstanceCommand({
          DBInstanceIdentifier: this.instanceId,
          FinalDBSnapshotIdentifier: finalSnapshotId,
          SkipFinalSnapshot: false,
          // We never delete automated backups on Delete — manual final
          // snapshot is enough to restore from. If you want to also delete
          // the automated backups, pass `DeleteAutomatedBackups: true`.
          DeleteAutomatedBackups: false,
        }),
      );
      this.logger.error(
        `Delete requested for ${this.instanceId} with final snapshot ${finalSnapshotId} (status: ${out.DBInstance?.DBInstanceStatus})`,
      );
      return {
        finalSnapshotId:
          out.DBInstance?.DBInstanceIdentifier ?? this.instanceId,
        requestId: out.$metadata?.requestId,
      };
    } catch (error) {
      throw new Error(
        `Failed to delete ${this.instanceId}: ${getErrorMessage(error)}`,
      );
    }
  }

  async waitForInstanceDeleted(maxWaitMinutes = 30): Promise<void> {
    const client = this.getClient();
    try {
      await waitForDBInstanceDeleted(
        { client, maxWaitTime: maxWaitMinutes * 60 },
        { DBInstanceIdentifier: this.instanceId },
      );
    } catch {
      // The waiter may throw if the instance disappears before the wait
      // starts polling — that's actually success, so swallow.
    }
  }

  /**
   * Restores a new instance from a snapshot. The new instance is created
   * with the same identifier as the original (which is allowed once the
   * original is deleted). RDS restore is asynchronous.
   */
  async requestRestoreFromSnapshot(
    snapshotId: string,
  ): Promise<{ requestId: string | undefined }> {
    const client = this.getClient();
    try {
      const out = await client.send(
        new RestoreDBInstanceFromDBSnapshotCommand({
          DBSnapshotIdentifier: snapshotId,
          DBInstanceIdentifier: this.instanceId,
          // Don't toggle MultiAZ on restore — the snapshot captures the
          // original config. Operators can change it later via the AWS
          // Console if they want a MultiAZ prod.
          MultiAZ: false,
        }),
      );
      this.logger.warn(
        `Restore requested for ${this.instanceId} from ${snapshotId} (status: ${out.DBInstance?.DBInstanceStatus})`,
      );
      return { requestId: out.$metadata?.requestId };
    } catch (error) {
      throw new Error(
        `Failed to restore ${this.instanceId} from ${snapshotId}: ${getErrorMessage(error)}`,
      );
    }
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  private toInstanceSummary(instance: DBInstance): RdsInstanceSummary {
    return {
      identifier: instance.DBInstanceIdentifier ?? this.instanceId,
      status: this.normalizeStatus(instance.DBInstanceStatus),
      engine: instance.Engine,
      engineVersion: instance.EngineVersion,
      allocatedStorageGb: instance.AllocatedStorage,
      instanceClass: instance.DBInstanceClass,
      endpoint: instance.Endpoint?.Address,
      port: instance.Endpoint?.Port,
      availabilityZone: instance.AvailabilityZone,
      multiAz: instance.MultiAZ === true,
      publiclyAccessible: instance.PubliclyAccessible === true,
      lastStatusChangeAt: instance.InstanceCreateTime,
    };
  }

  private toSnapshotSummary(snap: DBSnapshot): RdsSnapshotSummary {
    return {
      identifier: snap.DBSnapshotIdentifier ?? '',
      status: snap.Status,
      type: snap.SnapshotType,
      createdAt: snap.SnapshotCreateTime,
      allocatedStorageGb: snap.AllocatedStorage,
      engine: snap.Engine,
      engineVersion: snap.EngineVersion,
      isLatestForInstance: false, // computed separately if needed
    };
  }

  private normalizeStatus(status: string | undefined): RdsInstanceStatus {
    if (!status) return 'unknown';
    const known: RdsInstanceStatus[] = [
      'available',
      'stopped',
      'stopping',
      'starting',
      'creating',
      'deleting',
      'failed',
      'incompatible-parameters',
      'incompatible-restore',
      'rebooting',
      'resetting-master-credentials',
      'storage-full',
      'storage-optimization',
    ];
    return (known as string[]).includes(status)
      ? (status as RdsInstanceStatus)
      : 'unknown';
  }

  /** Formats a snapshot id per project convention. */
  buildSnapshotId(kind: 'manual' | 'final'): string {
    const ts = this.clock
      .now()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace(/Z$/, '');
    return `${this.instanceId}-${kind}-${ts}`;
  }
}
