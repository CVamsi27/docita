import { Injectable } from '@nestjs/common';
import { UploadSessionPurpose } from '@workspace/db';
import { StorageFile } from '@/domains/documents/application/ports/storage-provider.port';
import { UploadsCommandService } from './uploads-command.service';
import { UploadsQueryService } from './uploads-query.service';

export interface CreateUploadSessionOptions {
  expiresInMinutes?: number;
  purpose?: UploadSessionPurpose;
  doctorId?: string | null;
}

interface UploadSessionContext {
  onboardingId?: string;
  modifiedBy?: string;
  modifiedByRole?: string;
  authMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  uploadSecret?: string;
}

/**
 * Facade — delegates upload session reads and mutations to query/command services.
 */
// AuditLogged: upload session lifecycle (UploadsCommandService)
@Injectable()
export class UploadsService {
  constructor(
    private readonly queryService: UploadsQueryService,
    private readonly commandService: UploadsCommandService,
  ) {}

  assertReadyForUpload(id: string, uploadSecret: string) {
    return this.commandService.assertReadyForUpload(id, uploadSecret);
  }

  createSession(options?: CreateUploadSessionOptions) {
    return this.commandService.createSession(options);
  }

  getSession(id: string) {
    return this.queryService.getSession(id);
  }

  updateSession(id: string, file: StorageFile, context?: UploadSessionContext) {
    return this.commandService.updateSession(id, file, context);
  }
}
