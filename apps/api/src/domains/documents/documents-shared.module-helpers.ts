import { PrismaService } from '@/prisma/prisma.service';
import { DOCUMENT_PERSISTENCE_PORT } from './application/ports/document-persistence.port';
import { TEMPLATES_REPOSITORY_TOKEN } from './application/ports/templates.repository.port';
import { PrismaTemplatesRepository } from './infrastructure/repositories/prisma-templates.repository';
import { StorageProvider } from './application/ports/storage-provider.port';
import { TemplatesService } from './application/services/templates.service';
import { UploadsCommandService } from './application/services/uploads-command.service';
import { UploadsQueryService } from './application/services/uploads-query.service';
import { UploadsService } from './application/services/uploads.service';
import { StoredFileUrlResolverService } from './application/services/stored-file-url-resolver.service';

export const DOCUMENTS_SHARED_PROVIDERS = [
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
] as const;

export const DOCUMENTS_SHARED_EXPORTS = [
  TemplatesService,
  UploadsCommandService,
  UploadsQueryService,
  UploadsService,
  StoredFileUrlResolverService,
  StorageProvider,
] as const;
