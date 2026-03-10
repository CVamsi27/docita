import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export interface PoolConfig {
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

  getPgBouncerConnectionString(): string {
    const pgConfig = this.configService.getPgBouncerConfig();
    const dbConfig = this.configService.getDatabaseConfig();

    return `postgresql://${dbConfig.user}:${dbConfig.password}@${pgConfig.host}:${pgConfig.port}/${dbConfig.name}`;
  }

  getPrismaAccelerateUrl(): string {
    const accelerateConfig = this.configService.getPrismaAccelerateConfig();
    if (!accelerateConfig.key) {
      throw new Error('PRISMA_ACCELERATE_KEY not set in environment');
    }
    return `prisma://${accelerateConfig.key}`;
  }

  shouldUsePrismaAccelerate(): boolean {
    const accelerateConfig = this.configService.getPrismaAccelerateConfig();
    return accelerateConfig.enabled && !!accelerateConfig.key;
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
    this.logger.log(`Database Connection Pool Configuration:`);
    this.logger.log(`  Min connections: ${config.min}`);
    this.logger.log(`  Max connections: ${config.max}`);
    this.logger.log(`  Idle timeout: ${config.idleTimeoutMillis}ms`);
    this.logger.log(
      `  Connection timeout: ${config.connectionTimeoutMillis}ms`,
    );
    this.logger.log(`  Max uses per connection: ${config.maxUses}`);
    this.logger.log(`  Reap interval: ${config.reapIntervalMillis}ms`);

    const accelerateConfig = this.configService.getPrismaAccelerateConfig();
    const pgConfig = this.configService.getPgBouncerConfig();

    if (this.shouldUsePrismaAccelerate()) {
      this.logger.log(`  Using Prisma Accelerate for managed pooling`);
    } else if (pgConfig.enabled) {
      this.logger.log(`  Using PgBouncer at ${pgConfig.host}:${pgConfig.port}`);
    } else {
      this.logger.log(
        `  Using direct PostgreSQL connection with native pooling`,
      );
    }
  }

  getPoolTuningGuide(): string {
    const optConfig = this.getOptimalPoolConfig();
    return `
## Database Connection Pool Tuning Guide

### Current Configuration
- Recommended Max Pool Size: ${optConfig.max}
- Idle Timeout: ${optConfig.idleTimeoutMillis}ms
- Connection Timeout: ${optConfig.connectionTimeoutMillis}ms

### Recommendations by Deployment
1. **Serverless (AWS Lambda, Vercel Functions)**
   - Use: Prisma Accelerate or PgBouncer
   - Min: 1, Max: 5 (avoid connection bloat)
   - Each function instance gets isolated pool

2. **Traditional Servers**
   - Use: Native pooling + PgBouncer
   - Min: 10-20, Max: 50-100 (per server)
   - Monitor connections with: SELECT * FROM pg_stat_activity;

3. **Kubernetes**
   - Use: PgBouncer sidecar or Prisma Accelerate
   - Pod replicas each get limited pool
   - Horizontal scaling improves throughput

### Monitoring Queries
\`\`\`sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Query duration (slow queries)
SELECT query, now() - query_start FROM pg_stat_activity 
  WHERE query NOT LIKE '%pg_stat_activity%' 
  ORDER BY query_start DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes 
  ORDER BY idx_scan DESC LIMIT 20;
\`\`\`

### Environment Variables (Managed by AppConfigService)
- DATABASE_HOST: PostgreSQL host
- DATABASE_PORT: PostgreSQL port
- DATABASE_USER: Connection user
- DATABASE_PASSWORD: Connection password
- PGBOUNCER_HOST: PgBouncer proxy host
- PGBOUNCER_PORT: PgBouncer proxy port
- USE_PRISMA_ACCELERATE: Use Prisma Accelerate
- PRISMA_ACCELERATE_KEY: Prisma Accelerate API key
- SLOW_QUERY_THRESHOLD_MS: Threshold for slow query alerts
`;
  }
}
