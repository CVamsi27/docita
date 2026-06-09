import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { getPatientFullName } from '@workspace/utils';
import {
  DOCUMENT_PERSISTENCE_PORT,
  type DocumentPersistencePort,
} from '../ports/document-persistence.port';

@Injectable()
export class DocumentsQueryService {
  constructor(
    @Inject(DOCUMENT_PERSISTENCE_PORT)
    private readonly persistence: DocumentPersistencePort,
  ) {}

  async findAll(params: {
    clinicId: string;
    search?: string;
    type?: string;
    patientId?: string;
  }) {
    const where: Prisma.DocumentWhereInput = {
      clinicId: params.clinicId,
    };

    if (params.patientId) {
      where.patientId = params.patientId;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { type: { contains: params.search, mode: 'insensitive' } },
        {
          patient: {
            firstName: { contains: params.search, mode: 'insensitive' },
          },
        },
        {
          patient: {
            lastName: { contains: params.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const rows = await this.persistence.document.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.mapToResponse(row));
  }

  async findOne(id: string, clinicId: string) {
    const row = await this.persistence.document.findFirst({
      where: { id, clinicId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!row) throw new NotFoundException('Document not found');

    return this.mapToResponse(row);
  }

  private mapToResponse(row: {
    id: string;
    patientId: string;
    name: string;
    type: string;
    url: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
    updatedAt: Date;
    patient?: { id: string; firstName: string; lastName: string } | null;
  }) {
    return {
      id: row.id,
      patientId: row.patientId,
      name: row.name,
      type: row.type,
      url: row.url,
      filename: row.name,
      mimeType: row.mimeType,
      size: row.fileSize,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient
        ? {
            id: row.patient.id,
            name: getPatientFullName(row.patient),
            firstName: row.patient.firstName,
            lastName: row.patient.lastName,
          }
        : undefined,
    };
  }
}
