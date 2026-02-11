import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AppLogger } from './services/logger.service';
import { IdempotencyService } from './services/idempotency.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, AppLogger, IdempotencyService],
  exports: [EncryptionService, AppLogger, IdempotencyService],
})
export class CommonModule {}
