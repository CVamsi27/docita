import { Logger, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TemplatesController } from './presentation/controllers/templates.controller';
import { UploadsController } from './presentation/controllers/uploads.controller';
import { TemplatesService } from './application/services/templates.service';
import { UploadsService } from './application/services/uploads.service';
import { StoredFileUrlResolverService } from './application/services/stored-file-url-resolver.service';
import { StorageProvider } from './infrastructure/storage.provider';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';
import { R2StorageProvider } from './infrastructure/r2-storage.provider';

const logger = new Logger('DocumentsModule');

@Module({
  imports: [PrismaModule],
  controllers: [TemplatesController, UploadsController],
  providers: [
    TemplatesService,
    UploadsService,
    StoredFileUrlResolverService,
    {
      provide: StorageProvider,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const provider = configService.getStorageProvider();
        const isProduction = configService.isProduction();
        const r2Config = configService.getR2Config();
        const hasR2Credentials =
          !!r2Config.accountId &&
          !!r2Config.accessKeyId &&
          !!r2Config.secretAccessKey &&
          !!r2Config.bucketName;

        if (!isProduction) {
          return new LocalStorageProvider();
        }

        if (provider === 'r2' && hasR2Credentials) {
          return new R2StorageProvider();
        }

        logger.warn(
          'R2 storage provider is not fully configured; falling back to local provider. Startup validation should block production boot until storage is configured.',
        );
        return new LocalStorageProvider();
      },
    },
  ],
  exports: [
    TemplatesService,
    UploadsService,
    StoredFileUrlResolverService,
    StorageProvider,
  ],
})
export class DocumentsModule {}
