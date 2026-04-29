import { Injectable, NotFoundException } from '@nestjs/common';
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
}

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storageProvider: StorageProvider,
  ) {}

  async createSession() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    return this.prisma.uploadSession.create({
      data: {
        expiresAt,
      },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.uploadSession.findFirst({
      where: { id },
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
