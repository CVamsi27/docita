import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { IpRateLimitService } from '@/shared/modules/services/ip-rate-limit.service';
import { StartupValidationService } from '@/shared/modules/services/startup-validation.service';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { HealthCheckController } from './controllers/health-check.controller';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { DatabaseBackupService } from '@/shared/modules/database/database-backup.service';
import { SlowQueryLoggingService } from '@/shared/modules/database/slow-query-logging.service';
import { DatabaseIndexOptimizationService } from '@/shared/modules/database/database-index-optimization.service';
import { DatabasePoolingService } from '@/shared/modules/database/database-pooling.service';
import { PoolSaturationHistoryService } from '@/shared/modules/database/pool-saturation-history.service';
import { DatabaseRdsService } from '@/shared/modules/database/database-rds.service';
import { DatabaseControlStateRepository } from '@/shared/modules/database/database-control-state.repository';
import { DatabaseOperationsController } from './controllers/database-operations.controller';
import { TaggedCacheService } from '@/shared/modules/services/tagged-cache.service';

const COMMON_PROVIDERS = [
  EncryptionService,
  IpRateLimitService,
  StartupValidationService,
  ObservabilityService,
  IpRateLimitGuard,
  RequestContextInterceptor,
  DatabaseBackupService,
  SlowQueryLoggingService,
  DatabaseIndexOptimizationService,
  DatabasePoolingService,
  PoolSaturationHistoryService,
  DatabaseRdsService,
  DatabaseControlStateRepository,
  TaggedCacheService,
] as const;

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthCheckController, DatabaseOperationsController],
  providers: [...COMMON_PROVIDERS],
  exports: [...COMMON_PROVIDERS],
})
export class CommonModule {}
