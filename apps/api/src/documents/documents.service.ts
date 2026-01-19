import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    clinicId: string,
    params?: { search?: string; type?: string; patientId?: string },
  ) {
    if (!clinicId) {
      return [];
    }

    const { search, type, patientId } = params || {};
    const whereCallback: Prisma.DocumentWhereInput = {
      patient: { clinicId },
    };

    if (search) {
      whereCallback.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (type && type !== 'all') {
      whereCallback.type = type;
    }

    if (patientId) {
      whereCallback.patientId = patientId;
    }

    return await this.prisma.document.findMany({
      where: whereCallback,
      select: {
        id: true,
        patientId: true,
        name: true,
        type: true,
        url: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clinicId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        name: true,
        type: true,
        url: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            clinicId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Verify clinic access if clinicId is provided
    if (clinicId && document.patient.clinicId !== clinicId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  async create(
    data: {
      patientId: string;
      type: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      description?: string;
    },
    clinicId: string,
  ) {
    // Verify the patient belongs to the clinic
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { clinicId: true },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${data.patientId} not found`,
      );
    }

    if (patient.clinicId !== clinicId) {
      throw new ForbiddenException('You do not have access to this patient');
    }

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
      select: {
        id: true,
        patientId: true,
        name: true,
        type: true,
        url: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string, clinicId: string) {
    // findOne will verify access to the document
    const document = await this.findOne(id, clinicId);

    try {
      await unlink(document.url);
    } catch (error) {
      // Log but don't fail if file deletion fails (file might not exist on disk)
      this.logger.error('Failed to delete file from disk', error);
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }
}
