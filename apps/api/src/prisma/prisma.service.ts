import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantExtension } from '../common/extensions/tenant.extension';
import { encryptionExtension } from '../common/extensions/encryption.extension';
import { tenantStorage } from '../common/middleware/tenant.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readReplica?: PrismaClient;

  constructor() {
    let connectionString = process.env.DATABASE_URL;

    // Fix for "SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'"
    try {
      if (connectionString) {
        const url = new URL(connectionString);
        const sslMode = url.searchParams.get('sslmode');
        if (
          sslMode === 'require' ||
          sslMode === 'prefer' ||
          sslMode === 'verify-ca'
        ) {
          url.searchParams.set('sslmode', 'verify-full');
          if (!url.port) {
            url.port = '5432';
          }
          connectionString = url.toString();
        }
      }
    } catch (error) {
      console.warn(
        'Failed to parse DATABASE_URL for SSL mode adjustment',
        error,
      );
    }

    // Verify connectionString is valid or fallback to env
    if (!connectionString) {
      connectionString = process.env.DATABASE_URL!;
    } else {
      // Sync env var to ensure Prisma Client uses the correct connection string
      process.env.DATABASE_URL = connectionString;
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Initialize read replica if URL is provided
    if (process.env.DATABASE_READ_URL) {
      let readConnectionString = process.env.DATABASE_READ_URL;

      // Fix for "SECURITY WARNING" for read replica as well
      try {
        if (readConnectionString) {
          const url = new URL(readConnectionString);
          const sslMode = url.searchParams.get('sslmode');
          if (
            sslMode === 'require' ||
            sslMode === 'prefer' ||
            sslMode === 'verify-ca'
          ) {
            url.searchParams.set('sslmode', 'verify-full');
            if (!url.port) {
              url.port = '5432';
            }
            readConnectionString = url.toString();
          }
        }
      } catch (error) {
        console.warn(
          'Failed to parse DATABASE_READ_URL for SSL mode adjustment',
          error,
        );
      }

      const readPool = new Pool({ connectionString: readConnectionString });
      const readAdapter = new PrismaPg(readPool);

      const rawReadClient = new PrismaClient({
        adapter: readAdapter,
        log:
          process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['error'],
      });

      // Apply extensions to read replica
      this.readReplica = rawReadClient
        .$extends(encryptionExtension)
        .$extends(tenantExtension) as unknown as PrismaClient;
      this.logger.log('Read replica client initialized');
    } else {
      this.logger.log('Read replica not configured, using primary for reads');
    }
  }

  /**
   * Get client for read operations
   * Routes to read replica if available, otherwise uses primary
   * Use this for analytics, reporting, and other read-heavy operations
   */
  getReadClient(): PrismaClient {
    return this.readReplica || this;
  }

  async onModuleInit() {
    try {
      await this.$connect();

      // Apply extensions (DPDP Compliance & Tenant Isolation)
      // Since we are using driver adapters, legacy middleware ($use) is not supported.
      // We use $extends and mutate the singleton instance.
      const extended =
        this.$extends(encryptionExtension).$extends(tenantExtension);
      Object.assign(this, extended);

      this.logger.log('Primary database connection established');

      if (this.readReplica) {
        await this.readReplica.$connect();
        this.logger.log('Read replica connection established');
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Primary database connection closed');

    if (this.readReplica) {
      await this.readReplica.$disconnect();
      this.logger.log('Read replica connection closed');
    }
  }

  /**
   * Run a function bypassing tenant restrictions.
   * Useful for system tasks, schedulers, and admin operations.
   */
  async runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
    return tenantStorage.run({ bypassed: true }, fn);
  }
}
