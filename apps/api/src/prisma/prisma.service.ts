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
import { auditImmutabilityExtension } from '@/common/extensions/audit-immutability.extension';
import { tenantStorage } from '@/common/middleware/tenant.middleware';
import { EncryptionService } from '@/common/encryption.service';
import { slowQueryExtension } from '@/common/extensions/logging.extension';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    private encryptionService: EncryptionService,
    private configService: AppConfigService,
  ) {
    const databaseUrl = configService.getDatabaseUrl();
    const databaseReadUrl: string | undefined = undefined;
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
            url.port = '5434';
          }
          connectionString = url.toString();
        }
      }
    } catch {}

    if (!connectionString) {
      connectionString = databaseUrl;
    }

    const poolMax = isProduction
      ? DATABASE_CONSTANTS.POOL_MAX_PRODUCTION
      : DATABASE_CONSTANTS.POOL_MAX_DEVELOPMENT;
    const poolIdleTimeout = isProduction
      ? DATABASE_CONSTANTS.POOL_IDLE_TIMEOUT_PRODUCTION_MS
      : DATABASE_CONSTANTS.POOL_IDLE_TIMEOUT_DEVELOPMENT_MS;

    const pool = new Pool({
      connectionString,
      max: poolMax,
      idleTimeoutMillis: poolIdleTimeout,
      connectionTimeoutMillis: DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [],
    });
  }

  getReadClient(): PrismaClient {
    return this;
  }

  async onModuleInit() {
    try {
      await this.$connect();

      const extended = this.$extends(
        createEncryptionExtension(this.encryptionService),
      )
        .$extends(auditImmutabilityExtension)
        .$extends(tenantExtension)
        .$extends(slowQueryExtension);
      Object.assign(this, extended);

      this.logger.log('Primary database connection established');
    } catch (error: unknown) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Primary database connection closed');
  }

  async runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
    return tenantStorage.run({ bypassed: true }, fn);
  }
}
