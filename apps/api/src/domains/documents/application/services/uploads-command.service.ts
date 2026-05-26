import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  DOCUMENT_PERSISTENCE_PORT,
  type DocumentPersistencePort,
} from '@/domains/documents/application/ports/document-persistence.port';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
import { UploadSessionPurpose } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  hashUploadSecret,
  validateSessionReadyForUpload,
} from './uploads-session.helpers';
import type { CreateUploadSessionOptions } from './uploads.types';

interface UploadSessionContext {
  onboardingId?: string;
  modifiedBy?: string;
  modifiedByRole?: string;
  authMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  uploadSecret?: string;
}

// AuditLogged: upload session create/update and document storage
@Injectable()
export class UploadsCommandService {
  private readonly logger = new Logger(UploadsCommandService.name);

  constructor(
    @Inject(DOCUMENT_PERSISTENCE_PORT)
    private readonly persistence: DocumentPersistencePort,
    private readonly storageProvider: StorageProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async assertReadyForUpload(id: string, uploadSecret: string): Promise<void> {
    const session = await this.persistence.uploadSession.findFirst({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    validateSessionReadyForUpload(session, uploadSecret, this.clock);
  }

  async createSession(options?: CreateUploadSessionOptions) {
    const plaintextSecret = randomBytes(32).toString('base64url');
    const uploadSecretHash = hashUploadSecret(plaintextSecret);

    const expiresAt = this.clock.now();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (options?.expiresInMinutes ?? 15),
    );

    this.logger.log({
      action: 'upload.session.create',
      purpose: options?.purpose ?? UploadSessionPurpose.GENERAL,
    });

    const created = await this.persistence.uploadSession.create({
      data: {
        expiresAt,
        purpose: options?.purpose ?? UploadSessionPurpose.GENERAL,
        ...(options?.doctorId
          ? { doctorId: options.doctorId }
          : { doctorId: undefined }),
        uploadSecretHash,
      },
    });

    return {
      ...created,
      uploadSecret: plaintextSecret,
    };
  }

  async updateSession(
    id: string,
    file: StorageFile,
    context?: UploadSessionContext,
  ) {
    const session = await this.persistence.uploadSession.findFirst({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    validateSessionReadyForUpload(session, context?.uploadSecret, this.clock);

    this.logger.log({
      action: 'document.upload',
      clinicId: context?.onboardingId,
      sessionId: id,
      purpose: session.purpose,
    });

    const modifiedAt = this.clock.now().toISOString();
    const fileUrl = await this.storageProvider.upload(file, 'documents', {
      metadata: {
        asset_type: file.mimetype === 'application/pdf' ? 'pdf' : 'signature',
        upload_session_id: session.id,
        upload_purpose: session.purpose,
        onboarding_id: context?.onboardingId,
        doctor_id: session.doctorId,
        modified_at: modifiedAt,
        modified_by: context?.modifiedBy || session.doctorId || 'anonymous',
        modified_by_role: context?.modifiedByRole,
        auth_method: context?.authMethod || 'upload-session',
        auth_ip: context?.ipAddress,
        auth_user_agent: context?.userAgent,
      },
    });

    const updateResult = await this.persistence.uploadSession.updateMany({
      where: { id },
      data: {
        status: 'uploaded',
        fileUrl,
      },
    });
    if (updateResult.count === 0) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.persistence.uploadSession.findFirst({
      where: { id },
      select: {
        id: true,
        status: true,
        fileUrl: true,
        purpose: true,
        doctorId: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    if (
      session.purpose === UploadSessionPurpose.DOCTOR_SIGNATURE &&
      session.doctorId
    ) {
      await this.persistence.user.updateMany({
        where: { id: session.doctorId },
        data: {
          signatureUrl: fileUrl,
          signatureUploadedAt: this.clock.now(),
        },
      });
    }

    return updated;
  }
}
