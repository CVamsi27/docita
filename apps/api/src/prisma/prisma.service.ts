import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantExtension } from '@/common/extensions/tenant.extension';
import { createEncryptionExtension } from '@/common/extensions/encryption.extension';
import { tenantStorage } from '@/common/middleware/tenant.middleware';
import { EncryptionService } from '@/common/encryption.service';
import { slowQueryExtension } from '@/common/extensions/logging.extension';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readReplica?: PrismaClient;

  private asPrismaClient(value: unknown): PrismaClient {
    return value as PrismaClient;
  }

  constructor(
    private encryptionService: EncryptionService,
    private configService: AppConfigService,
  ) {
    const databaseUrl = configService.getDatabaseUrl();
    const databaseReadUrl = configService.getDatabaseReadUrl();
    const isProduction = configService.isProduction();

    let connectionString = databaseUrl;

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
    } catch {}

    if (!connectionString) {
      connectionString = databaseUrl;
    } else {
      process.env.DATABASE_URL = connectionString;
    }

    const poolMax = isProduction ? 20 : 5;
    const poolIdleTimeout = isProduction ? 300000 : 30000;

    const pool = new Pool({
      connectionString,
      max: poolMax,
      idleTimeoutMillis: poolIdleTimeout,
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [],
    });

    if (databaseReadUrl) {
      let readConnectionString = databaseReadUrl;

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
      } catch {}

      const readPool = new Pool({ connectionString: readConnectionString });
      const readAdapter = new PrismaPg(readPool);

      const rawReadClient = new PrismaClient({
        adapter: readAdapter,
        log: [],
      });

      const extendedReadClient = rawReadClient
        .$extends(createEncryptionExtension(this.encryptionService))
        .$extends(tenantExtension);
      this.readReplica = this.asPrismaClient(extendedReadClient);
      this.logger.log('Read replica client initialized');
    } else {
      this.logger.log('Read replica not configured, using primary for reads');
    }
  }

  getReadClient(): PrismaClient {
    return this.readReplica || this;
  }

  async onModuleInit() {
    try {
      await this.$connect();

      const extended = this.$extends(
        createEncryptionExtension(this.encryptionService),
      )
        .$extends(tenantExtension)
        .$extends(slowQueryExtension);
      Object.assign(this, extended);

      this.logger.log('Primary database connection established');

      if (this.readReplica) {
        await this.readReplica.$connect();
        this.logger.log('Read replica connection established');
      }
    } catch (error: unknown) {
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

  async runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
    return tenantStorage.run({ bypassed: true }, fn);
  }
}
