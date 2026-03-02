import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { TemplatesController } from './presentation/controllers/templates.controller';
import { UploadsController } from './presentation/controllers/uploads.controller';
import { TemplatesService } from './application/services/templates.service';
import { UploadsService } from './application/services/uploads.service';
import { StorageProvider } from './infrastructure/storage.provider';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';

@Module({
  imports: [PrismaModule],
  controllers: [TemplatesController, UploadsController],
  providers: [
    TemplatesService,
    UploadsService,
    {
      provide: StorageProvider,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [TemplatesService, UploadsService, StorageProvider],
})
export class DocumentsModule {}
