import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TemplatesService } from './application/services/templates.service';
import { UploadsService } from './application/services/uploads.service';
import { StoredFileUrlResolverService } from './application/services/stored-file-url-resolver.service';
import { StorageProvider } from './infrastructure/storage.provider';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';
import { R2StorageProvider } from './infrastructure/r2-storage.provider';

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
          if (provider === 'r2' && hasR2Credentials) {
            return new R2StorageProvider();
          }
          return new LocalStorageProvider({
            apiUrl: configService.getApiUrl(),
          });
        }

        if (provider === 'r2' && hasR2Credentials) {
          return new R2StorageProvider();
        }

        throw new Error(
          'Production worker requires STORAGE_PROVIDER=r2 with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
        );
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
