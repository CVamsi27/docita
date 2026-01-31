import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AppLogger } from './services/logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, AppLogger],
  exports: [EncryptionService, AppLogger],
})
export class CommonModule {}
