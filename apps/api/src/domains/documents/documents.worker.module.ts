import { PrismaService } from '@/prisma/prisma.service';
import { DOCUMENT_PERSISTENCE_PORT } from './application/ports/document-persistence.port';
import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TemplatesService } from './application/services/templates.service';
import { UploadsService } from './application/services/uploads.service';
import { UploadsCommandService } from './application/services/uploads-command.service';
import { UploadsQueryService } from './application/services/uploads-query.service';
import { StoredFileUrlResolverService } from './application/services/stored-file-url-resolver.service';
import { TEMPLATES_REPOSITORY_TOKEN } from './application/ports/templates.repository.port';
import { PrismaTemplatesRepository } from './infrastructure/repositories/prisma-templates.repository';
import { StorageProvider } from './application/ports/storage-provider.port';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';
import { R2StorageProvider } from './infrastructure/r2-storage.provider';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Module({
  imports: [PrismaWorkerModule],
  providers: [
    { provide: DOCUMENT_PERSISTENCE_PORT, useExisting: PrismaService },
    TemplatesService,
    UploadsCommandService,
    UploadsQueryService,
    UploadsService,
    StoredFileUrlResolverService,
    {
      provide: TEMPLATES_REPOSITORY_TOKEN,
      useClass: PrismaTemplatesRepository,
    },
    {
      provide: StorageProvider,
      inject: [AppConfigService, CLOCK_PORT],
      useFactory: (configService: AppConfigService, clock: IClock) => {
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
            return new R2StorageProvider(r2Config, clock);
          }
          return new LocalStorageProvider({
            apiUrl: configService.getApiUrl(),
          });
        }

        if (provider === 'r2' && hasR2Credentials) {
          return new R2StorageProvider(r2Config, clock);
        }

        throw new Error(
          'Production worker requires STORAGE_PROVIDER=r2 with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
        );
      },
    },
  ],
  exports: [
    TemplatesService,
    UploadsCommandService,
    UploadsQueryService,
    UploadsService,
    StoredFileUrlResolverService,
    StorageProvider,
  ],
})
export class DocumentsWorkerModule {}
