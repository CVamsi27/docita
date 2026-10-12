import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  createUtcPoolConfig,
  createPoolSaturationProbe,
  type PoolSaturationProbe,
  type PoolSaturationSnapshot,
} from '@workspace/db';
import { tenantExtension } from '@/shared/common/extensions/tenant.extension';
import { createEncryptionExtension } from '@/shared/common/extensions/encryption.extension';
import { auditImmutabilityExtension } from '@/shared/common/extensions/audit-immutability.extension';
import { rlsRoutingExtension } from '@/shared/common/extensions/rls-routing.extension';
import { tenantStorage } from '@/shared/common/middleware/tenant.middleware';
import { EncryptionService } from '@/shared/common/encryption.service';
import { slowQueryExtension } from '@/shared/common/extensions/logging.extension';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { getDefaultTransactionOptions } from '@/shared/common/database-transaction-options';
import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';
import { makeQueryBudgetExtension } from '@/shared/common/extensions/query-budget.extension';
import { getRequestQueryCounterContext } from '@/shared/common/context/request-context.store';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  /**
   * The pool actually backing this client. Kept so operations endpoints can
   * report live saturation instead of a computed configuration: the pool values
   * come from DATABASE_CONSTANTS, while `DatabasePoolingService` returns a
   * separate `cpuCount * 5 + 10` suggestion that nothing applies.
   */
  private readonly pool: Pool;
  private readonly saturation: PoolSaturationProbe;

  constructor(
    private encryptionService: EncryptionService,
    private configService: AppConfigService,
  ) {
    const databaseUrl = configService.getDatabaseUrl();
    const isProduction = configService.isProduction();

    const poolMax = isProduction
      ? DATABASE_CONSTANTS.POOL_MAX_PRODUCTION
      : DATABASE_CONSTANTS.POOL_MAX_DEVELOPMENT;
    const poolIdleTimeout = isProduction
      ? DATABASE_CONSTANTS.POOL_IDLE_TIMEOUT_PRODUCTION_MS
      : DATABASE_CONSTANTS.POOL_IDLE_TIMEOUT_DEVELOPMENT_MS;

    const pool = new Pool(
      createUtcPoolConfig({
        connectionString: databaseUrl,
        max: poolMax,
        idleTimeoutMillis: poolIdleTimeout,
        connectionTimeoutMillis: DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS,
      }),
    );
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [],
      transactionOptions: getDefaultTransactionOptions(),
    });

    this.pool = pool;
    this.saturation = createPoolSaturationProbe(pool);
  }

  getReadClient(): PrismaClient {
    return this;
  }

  /**
   * Live saturation of the pool this client actually uses. `queuedForMs` is the
   * only signal here that a request is waiting for a *connection* rather than
   * for the database, which is the condition behind unexplained latency spikes
   * and behind the untranslated pool-timeout path in `PrismaRetryInterceptor`.
   */
  getPoolSaturation(): PoolSaturationSnapshot {
    return this.saturation.snapshot();
  }

  onModuleInit(): void {
    // Extension order matters:
    //   1. rls-routing  — first, so the eventual query lands on the
    //      RLS-scoped tx connection (when one is published in
    //      activeTxStorage); subsequent extensions then run against that
    //      tx client.
    //   2. encryption   — transparent column-level encryption.
    //   3. audit        — immutability guard for audit-log writes.
    //   4. tenant       — fails closed when no clinic context is set.
    //   5. slow-query   — wall-clock observability.
    //   6. query-budget — request-scoped query-count observability.
    const extended = this.$extends(rlsRoutingExtension)
      .$extends(createEncryptionExtension(this.encryptionService))
      .$extends(auditImmutabilityExtension)
      .$extends(tenantExtension)
      .$extends(slowQueryExtension)
      .$extends(
        makeQueryBudgetExtension({
          getContext: getRequestQueryCounterContext,
          logger: this.logger,
        }),
      );
    Object.assign(this, extended);

    void this.$connect()
      .then(() => {
        this.logger.log('Primary database connection established');
      })
      .catch((error: unknown) => {
        this.logger.error('Failed to connect to database', error);
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Primary database connection closed');
  }

  async runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
    return tenantStorage.run({ bypassed: true }, fn);
  }
}
