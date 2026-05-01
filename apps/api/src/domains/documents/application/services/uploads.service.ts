import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/infrastructure/storage.provider';
import { UploadSessionPurpose } from '@workspace/db';

interface UploadSessionContext {
  onboardingId?: string;
  modifiedBy?: string;
  modifiedByRole?: string;
  authMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  uploadSecret?: string;
}

export interface CreateUploadSessionOptions {
  expiresInMinutes?: number;
  purpose?: UploadSessionPurpose;
  doctorId?: string | null;
}

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storageProvider: StorageProvider,
  ) {}

  private hashUploadSecret(plaintext: string): string {
    return createHash('sha256').update(plaintext, 'utf8').digest('hex');
  }

  private assertUploadSecretValid(
    uploadSecretHash: string | null,
    uploadSecret: string | undefined,
  ): void {
    if (!uploadSecretHash) {
      throw new BadRequestException(
        'This upload session is no longer valid. Create a new upload session.',
      );
    }

    const trimmed = uploadSecret?.trim();
    if (!trimmed) {
      throw new UnauthorizedException(
        'Upload credentials are required (X-Upload-Secret header).',
      );
    }

    const expected = Buffer.from(uploadSecretHash, 'hex');
    const candidate = Buffer.from(this.hashUploadSecret(trimmed), 'hex');

    if (
      expected.length !== candidate.length ||
      !timingSafeEqual(expected, candidate)
    ) {
      throw new UnauthorizedException('Invalid upload credentials');
    }
  }

  async createSession(options?: CreateUploadSessionOptions) {
    const plaintextSecret = randomBytes(32).toString('base64url');
    const uploadSecretHash = this.hashUploadSecret(plaintextSecret);

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (options?.expiresInMinutes ?? 15),
    );

    const created = await this.prisma.uploadSession.create({
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

  async getSession(id: string) {
    const session = await this.prisma.uploadSession.findFirst({
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

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async updateSession(
    id: string,
    file: StorageFile,
    context?: UploadSessionContext,
  ) {
    const session = await this.prisma.uploadSession.findFirst({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    this.assertUploadSecretValid(
      session.uploadSecretHash,
      context?.uploadSecret,
    );

    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This upload link has expired');
    }

    if (session.status === 'uploaded' || session.fileUrl) {
      throw new BadRequestException('This upload link has already been used');
    }

    const modifiedAt = new Date().toISOString();
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

    const updateResult = await this.prisma.uploadSession.updateMany({
      where: { id },
      data: {
        status: 'uploaded',
        fileUrl,
      },
    });
    if (updateResult.count === 0) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.uploadSession.findFirst({
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
      await this.prisma.user.updateMany({
        where: { id: session.doctorId },
        data: {
          signatureUrl: fileUrl,
          signatureUploadedAt: new Date(),
        },
      });
    }

    return updated;
  }
}
