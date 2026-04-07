import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AppLogger } from '@/shared/modules/services/logger.service';
import { IdempotencyService } from '@/shared/modules/services/idempotency.service';
import { IpRateLimitService } from '@/shared/modules/services/ip-rate-limit.service';
import { OptimisticConcurrencyService } from '@/shared/modules/services/optimistic-concurrency.service';
import { BusinessRulesService } from '@/shared/modules/services/business-rules.service';
import { StartupValidationService } from '@/shared/modules/services/startup-validation.service';
import { SecretsManagerService } from '@/shared/modules/services/secrets-manager.service';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { HealthCheckController } from './controllers/health-check.controller';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { DatabaseBackupService } from '@/shared/modules/database/database-backup.service';
import { SlowQueryLoggingService } from '@/shared/modules/database/slow-query-logging.service';
import { DatabaseIndexOptimizationService } from '@/shared/modules/database/database-index-optimization.service';
import { DatabasePoolingService } from '@/shared/modules/database/database-pooling.service';
import { DatabaseOperationsController } from './controllers/database-operations.controller';
import { TaggedCacheService } from '@/shared/modules/services/tagged-cache.service';
import { N1QueryDetectionService } from '@/shared/modules/services/n1-query-detection.service';
import { CursorPaginationService } from '@/shared/modules/services/cursor-pagination.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthCheckController, DatabaseOperationsController],
  providers: [
    EncryptionService,
    AppLogger,
    IdempotencyService,
    IpRateLimitService,
    OptimisticConcurrencyService,
    BusinessRulesService,
    StartupValidationService,
    SecretsManagerService,
    ObservabilityService,
    IpRateLimitGuard,
    RequestContextInterceptor,
    DatabaseBackupService,
    SlowQueryLoggingService,
    DatabaseIndexOptimizationService,
    DatabasePoolingService,
    TaggedCacheService,
    N1QueryDetectionService,
    CursorPaginationService,
  ],
  exports: [
    EncryptionService,
    AppLogger,
    IdempotencyService,
    IpRateLimitService,
    OptimisticConcurrencyService,
    BusinessRulesService,
    StartupValidationService,
    SecretsManagerService,
    ObservabilityService,
    IpRateLimitGuard,
    RequestContextInterceptor,
    DatabaseBackupService,
    SlowQueryLoggingService,
    DatabaseIndexOptimizationService,
    DatabasePoolingService,
    TaggedCacheService,
    N1QueryDetectionService,
    CursorPaginationService,
  ],
})
export class CommonModule {}
