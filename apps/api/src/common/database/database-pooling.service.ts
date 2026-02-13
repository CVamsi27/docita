/**
 * Database Connection Pooling Configuration
 * Configures optimal pool settings for production
 * Supports both native PostgreSQL pooling and Prisma Accelerate
 */

import { Injectable, Logger } from '@nestjs/common';

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

  /**
   * Get optimal pool configuration based on environment and node count
   */
  getOptimalPoolConfig(nodeCount: number = 1): PoolConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const cpuCount = parseInt(process.env.CPU_COUNT || '4', 10);

    // Production config: more aggressive pooling for reliability
    if (isProduction) {
      return {
        min: 10,
        max: cpuCount * 5 + 10, // Total: 30 for 4 CPU (safe upper bound)
        idleTimeoutMillis: 300_000, // 5 minutes
        connectionTimeoutMillis: 10_000, // 10 seconds
        maxUses: 7500, // Recycle connections after 7500 uses
        reapIntervalMillis: 60_000, // Check idle every 60s
      };
    }

    // Development config: smaller pool
    return {
      min: 2,
      max: 5,
      idleTimeoutMillis: 30_000, // 30 seconds
      connectionTimeoutMillis: 5_000, // 5 seconds
      maxUses: Infinity,
      reapIntervalMillis: 30_000,
    };
  }

  /**
   * Get connection string with pool parameters for PgBouncer
   * PgBouncer sits between app and PostgreSQL for advanced pooling
   */
  getPgBouncerConnectionString(): string {
    const pgBouncerHost = process.env.PGBOUNCER_HOST || 'localhost';
    const pgBouncerPort = process.env.PGBOUNCER_PORT || '6432';
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const database = process.env.DATABASE_NAME;

    return `postgresql://${user}:${password}@${pgBouncerHost}:${pgBouncerPort}/${database}`;
  }

  /**
   * Get connection string for Prisma Accelerate (managed pooling service)
   * More convenient than PgBouncer for serverless environments
   */
  getPrismaAccelerateUrl(): string {
    const accelerateKey = process.env.PRISMA_ACCELERATE_KEY;
    if (!accelerateKey) {
      throw new Error('PRISMA_ACCELERATE_KEY not set in environment');
    }
    return `prisma://${accelerateKey}`;
  }

  /**
   * Determine whether to use Prisma Accelerate or PgBouncer
   */
  shouldUsePrismaAccelerate(): boolean {
    return (
      process.env.USE_PRISMA_ACCELERATE === 'true' &&
      !!process.env.PRISMA_ACCELERATE_KEY
    );
  }

  /**
   * Get Prisma connection configuration with optimal pooling
   */
  getPrismaPoolConfig() {
    const config = this.getOptimalPoolConfig();

    return {
      // Connection pool settings
      connection: {
        timeout: config.connectionTimeoutMillis,
      },
      // Query timeout
      queryTimeout: 30_000,
      // Pool settings (if using Prisma's native pooling)
      pool: {
        min: config.min,
        max: config.max,
        idleTimeoutMillis: config.idleTimeoutMillis,
      },
    };
  }

  /**
   * Log pool configuration for debugging
   */
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
    } else if (process.env.USE_PGBOUNCER === 'true') {
      this.logger.log(
        `  Using PgBouncer at ${process.env.PGBOUNCER_HOST}:${process.env.PGBOUNCER_PORT}`,
      );
    } else {
      this.logger.log(
        `  Using direct PostgreSQL connection with native pooling`,
      );
    }
  }

  /**
   * Get documentation for manual pool tuning
   */
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
