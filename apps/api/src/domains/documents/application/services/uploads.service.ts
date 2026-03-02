import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/infrastructure/storage.provider';
import { UploadSessionPurpose } from '@workspace/db';

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
    const session = await this.prisma.uploadSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async updateSession(id: string, file: StorageFile) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const fileUrl = await this.storageProvider.upload(file, 'documents');

    const updated = await this.prisma.uploadSession.update({
      where: { id },
      data: {
        status: 'uploaded',
        fileUrl,
      },
    });

    if (
      session.purpose === UploadSessionPurpose.DOCTOR_SIGNATURE &&
      session.doctorId
    ) {
      await this.prisma.user.update({
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
