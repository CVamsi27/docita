import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

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

  async updateSession(id: string, filePath: string) {
    // In a real app, upload to cloud storage and get public URL
    // For this demo, we'll just pretend the file path is the URL
    // or use a placeholder since the OCR is simulated anyway.

    return this.prisma.uploadSession.update({
      where: { id },
      data: {
        status: 'uploaded',
        fileUrl: filePath, // In real app: 'https://s3...'
      },
    });
  }
}
