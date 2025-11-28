import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.document.findMany({
      include: {
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async create(data: {
    patientId: string;
    type: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    description?: string;
  }) {
    return this.prisma.document.create({
      data: {
        patientId: data.patientId,
        type: data.type,
        name: data.fileName,
        url: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        description: data.description,
      },
      include: {
        patient: true,
      },
    });
  }

  async remove(id: string) {
    const document = await this.findOne(id);

    // Delete file from filesystem
    try {
      await unlink(document.url);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }

    // Delete from database
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }
}
