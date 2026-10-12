import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  maxUses: number;
  reapIntervalMillis: number;
}

@Injectable()
export class DatabasePoolingService {
  private readonly logger = new Logger(DatabasePoolingService.name);

  constructor(private configService: AppConfigService) {}

  /**
   * A **computed suggestion**, not the pool the API actually connects through.
   *
   * `PrismaService` builds its pool from `DATABASE_CONSTANTS`
   * (`POOL_MAX_PRODUCTION` = 15, `POOL_MAX_DEVELOPMENT` = 5), so this returns a
   * different `max` from the running client on any host where
   * `cpuCount * 5 + 10` is not 15. Use it for capacity planning only; read live
   * counters from `PrismaService.getPoolSaturation()`, exposed at
   * `GET /operations/database/pooling/saturation`.
   */
  getOptimalPoolConfig(_nodeCount: number = 1): PoolConfig {
    const isProduction = this.configService.isProduction();
    const cpuCount = this.configService.getCpuCount();

    if (isProduction) {
      return {
        min: 10,
        max: cpuCount * 5 + 10,
        idleTimeoutMillis: 300_000,
        connectionTimeoutMillis: 10_000,
        maxUses: 7500,
        reapIntervalMillis: 60_000,
      };
    }

    return {
      min: 2,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      maxUses: Infinity,
      reapIntervalMillis: 30_000,
    };
  }

  getPrismaPoolConfig() {
    const config = this.getOptimalPoolConfig();

    return {
      connection: {
        timeout: config.connectionTimeoutMillis,
      },
      queryTimeout: 30_000,
      pool: {
        min: config.min,
        max: config.max,
        idleTimeoutMillis: config.idleTimeoutMillis,
      },
    };
  }

  logPoolConfig(): void {
    const config = this.getOptimalPoolConfig();
    this.logger.log(
      `Database Connection Pool suggestion (advisory, not applied): min=${config.min} max=${config.max} idle=${config.idleTimeoutMillis}ms connect=${config.connectionTimeoutMillis}ms`,
    );
  }
}
