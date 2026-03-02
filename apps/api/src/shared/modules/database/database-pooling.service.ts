import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private configService: ConfigService) {}

  getOptimalPoolConfig(nodeCount: number = 1): PoolConfig {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const cpuCount = parseInt(
      this.configService.get<string>('CPU_COUNT') || '4',
      10,
    );

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
    const pgBouncerHost =
      this.configService.get<string>('PGBOUNCER_HOST') || 'localhost';
    const pgBouncerPort =
      this.configService.get<string>('PGBOUNCER_PORT') || '6432';
    const user = this.configService.get<string>('DATABASE_USER');
    const password = this.configService.get<string>('DATABASE_PASSWORD');
    const database = this.configService.get<string>('DATABASE_NAME');

    return `postgresql://${user}:${password}@${pgBouncerHost}:${pgBouncerPort}/${database}`;
  }

  getPrismaAccelerateUrl(): string {
    const accelerateKey = this.configService.get<string>(
      'PRISMA_ACCELERATE_KEY',
    );
    if (!accelerateKey) {
      throw new Error('PRISMA_ACCELERATE_KEY not set in environment');
    }
    return `prisma://${accelerateKey}`;
  }

  shouldUsePrismaAccelerate(): boolean {
    return (
      this.configService.get<string>('USE_PRISMA_ACCELERATE') === 'true' &&
      !!this.configService.get<string>('PRISMA_ACCELERATE_KEY')
    );
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

    if (this.shouldUsePrismaAccelerate()) {
      this.logger.log(`  Using Prisma Accelerate for managed pooling`);
    } else if (this.configService.get<string>('USE_PGBOUNCER') === 'true') {
      const pgBouncerHost =
        this.configService.get<string>('PGBOUNCER_HOST') || 'localhost';
      const pgBouncerPort =
        this.configService.get<string>('PGBOUNCER_PORT') || '6432';
      this.logger.log(`  Using PgBouncer at ${pgBouncerHost}:${pgBouncerPort}`);
    } else {
      this.logger.log(
        `  Using direct PostgreSQL connection with native pooling`,
      );
    }
  }

  getPoolTuningGuide(): string {
    return `
## Database Connection Pool Tuning Guide

### Current Configuration
- Recommended Max Pool Size: ${this.getOptimalPoolConfig().max}
- Idle Timeout: ${this.getOptimalPoolConfig().idleTimeoutMillis}ms
- Connection Timeout: ${this.getOptimalPoolConfig().connectionTimeoutMillis}ms

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

### Environment Variables
- DATABASE_HOST: PostgreSQL host
- DATABASE_PORT: PostgreSQL port (default: 5432)
- DATABASE_USER: Connection user
- DATABASE_PASSWORD: Connection password
- PGBOUNCER_HOST: PgBouncer proxy host
- PGBOUNCER_PORT: PgBouncer proxy port (default: 6432)
- USE_PRISMA_ACCELERATE: Set to 'true' to use Prisma Accelerate
- PRISMA_ACCELERATE_KEY: Prisma Accelerate API key
- SLOW_QUERY_THRESHOLD_MS: Threshold for slow query alerts (default: 1000ms)
`;
  }
}
