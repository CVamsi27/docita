import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@workspace/db';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readReplica?: PrismaClient;

  constructor() {
    super({
      // Configure connection pool settings to prevent exhaustion
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Initialize read replica if URL is provided
    if (process.env.DATABASE_READ_URL) {
      this.readReplica = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_READ_URL,
          },
        },
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
