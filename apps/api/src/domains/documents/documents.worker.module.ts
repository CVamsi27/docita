import { Logger, Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TemplatesService } from './application/services/templates.service';
import { UploadsService } from './application/services/uploads.service';
import { StoredFileUrlResolverService } from './application/services/stored-file-url-resolver.service';
import { StorageProvider } from './infrastructure/storage.provider';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';
import { R2StorageProvider } from './infrastructure/r2-storage.provider';

const logger = new Logger('DocumentsWorkerModule');

@Module({
  imports: [PrismaWorkerModule],
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
          return new LocalStorageProvider({
            apiUrl: configService.getApiUrl(),
          });
        }

        if (provider === 'r2' && hasR2Credentials) {
          return new R2StorageProvider();
        }

        logger.warn(
          'R2 storage provider is not fully configured; falling back to local provider. Startup validation should block production boot until storage is configured.',
        );
        return new LocalStorageProvider({
          apiUrl: configService.getApiUrl(),
        });
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
export class DocumentsWorkerModule {}
