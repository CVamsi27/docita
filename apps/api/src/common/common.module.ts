import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AppLogger } from './services/logger.service';
import { IdempotencyService } from './services/idempotency.service';
import { IpRateLimitService } from './services/ip-rate-limit.service';
import { OptimisticConcurrencyService } from './services/optimistic-concurrency.service';
import { BusinessRulesService } from './services/business-rules.service';
import { StartupValidationService } from './services/startup-validation.service';
import { SecretsManagerService } from './services/secrets-manager.service';
import { ObservabilityService } from './services/observability.service';
import { IpRateLimitGuard } from './guards/ip-rate-limit.guard';
import { HealthCheckController } from './controllers/health-check.controller';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { DatabaseBackupService } from './database/database-backup.service';
import { SlowQueryLoggingService } from './database/slow-query-logging.service';
import { DatabaseIndexOptimizationService } from './database/database-index-optimization.service';
import { DatabasePoolingService } from './database/database-pooling.service';
import { DatabaseOperationsController } from './controllers/database-operations.controller';

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
  ],
})
export class CommonModule {}
