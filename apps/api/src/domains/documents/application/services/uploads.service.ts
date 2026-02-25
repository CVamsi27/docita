import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  StorageProvider,
  StorageFile,
} from '../../infrastructure/storage.provider';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storageProvider: StorageProvider,
  ) {}

  async createSession() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

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
    // 1. Upload to storage (sanitizes, validates, and strips EXIF)
    const fileUrl = await this.storageProvider.upload(file, 'documents');

    // 2. Update DB
    return this.prisma.uploadSession.update({
      where: { id },
      data: {
        status: 'uploaded',
        fileUrl,
      },
    });
  }
}
