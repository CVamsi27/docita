import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { EncryptionService } from '@/common/encryption.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [EncryptionService, PrismaService],
  exports: [PrismaService, EncryptionService],
})
export class PrismaWorkerModule {}
