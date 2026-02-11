import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: StorageProvider,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [UploadsService, StorageProvider],
})
export class UploadsModule {}
