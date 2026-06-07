import { Logger, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { TemplatesController } from './presentation/controllers/templates.controller';
import { UploadsController } from './presentation/controllers/uploads.controller';
import { UploadSessionSecretGuard } from './presentation/guards/upload-session-secret.guard';
import { StorageProvider } from './application/ports/storage-provider.port';
import { LocalStorageProvider } from './infrastructure/local-storage.provider';
import { R2StorageProvider } from './infrastructure/r2-storage.provider';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AuthGuardsModule } from '@/shared/modules/auth/auth/auth-guards.module';
import { DocumentsController } from './presentation/controllers/documents.controller';
import { DocumentsQueryService } from './application/services/documents.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import {
  DOCUMENTS_SHARED_PROVIDERS,
  DOCUMENTS_SHARED_EXPORTS,
} from './documents-shared.module-helpers';

const logger = new Logger('DocumentsModule');

@Module({
  imports: [PrismaModule, AuthGuardsModule, AuditModule],
  controllers: [TemplatesController, UploadsController, DocumentsController],
  providers: [
    ...DOCUMENTS_SHARED_PROVIDERS,
    UploadSessionSecretGuard,
// jscpd:ignore-start
    DocumentsQueryService,
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
          return new LocalStorageProvider({
// jscpd:ignore-end
            apiUrl: configService.getApiUrl(),
          });
        }

        if (provider === 'r2' && hasR2Credentials)
          return new R2StorageProvider(r2Config, clock);

        logger.warn(
          'R2 storage provider is not fully configured; falling back to local provider. Startup validation should block production boot until storage is configured.',
        );
        return new LocalStorageProvider({
          apiUrl: configService.getApiUrl(),
        });
      },
    },
  ],
  exports: [...DOCUMENTS_SHARED_EXPORTS],
})
export class DocumentsModule {}
