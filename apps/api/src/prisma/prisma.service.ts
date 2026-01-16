import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
          connectionString = url.toString();
        }
      }
    } catch (error) {
      console.warn(
        'Failed to parse DATABASE_URL for SSL mode adjustment',
        error,
      );
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

      this.readReplica = new PrismaClient({
        adapter: readAdapter,
        log:
          process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['error'],
      });
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
}
