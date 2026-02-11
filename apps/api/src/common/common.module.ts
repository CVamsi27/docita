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
import { IpRateLimitGuard } from './guards/ip-rate-limit.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    EncryptionService,
    AppLogger,
    IdempotencyService,
    IpRateLimitService,
    OptimisticConcurrencyService,
    BusinessRulesService,
    StartupValidationService,
    SecretsManagerService,
    IpRateLimitGuard,
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
    IpRateLimitGuard,
  ],
})
export class CommonModule {}
