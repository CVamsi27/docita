import { Injectable } from '@nestjs/common';
import { medicalDocumentContentJsonSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { IMedicalDocumentsRepository } from '@/domains/medical-documents/core/repositories/medical-documents.repository.interface';
import { MedicalDocument, Prisma } from '@workspace/db';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';

@Injectable()
export class PrismaMedicalDocumentsRepository implements IMedicalDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private mapDocument(row: MedicalDocument): MedicalDocument {
    const content =
      parsePrismaJsonColumn(row.content, medicalDocumentContentJsonSchema) ??
      {};
    return {
      ...row,
      content: content as MedicalDocument['content'],
    };
  }

  async create(
    data: Prisma.MedicalDocumentCreateInput,
  ): Promise<MedicalDocument> {
    const row = await this.prisma.medicalDocument.create({ data });
    return this.mapDocument(row);
  }

  async findAllForPatient(
    clinicId: string,
    patientId: string,
  ): Promise<MedicalDocument[]> {
    const rows = await this.getReadClient().medicalDocument.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapDocument(row));
  }

  async findOne(id: string, clinicId: string): Promise<MedicalDocument | null> {
    const row = await this.getReadClient().medicalDocument.findFirst({
      where: { id, clinicId },
    });
    return row ? this.mapDocument(row) : null;
  }

  async update(
    id: string,
    data: Prisma.MedicalDocumentUpdateInput,
  ): Promise<MedicalDocument> {
    const row = await this.prisma.medicalDocument.update({
      where: { id },
      data,
    });
    return this.mapDocument(row);
  }

  async delete(id: string): Promise<MedicalDocument> {
    const row = await this.prisma.medicalDocument.delete({ where: { id } });
    return this.mapDocument(row);
  }
}
