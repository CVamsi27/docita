import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IMedicalDocumentsRepository } from '@/domains/medical-documents/core/repositories/medical-documents.repository.interface';
import { MedicalDocument, Prisma } from '@workspace/db';

@Injectable()
export class PrismaMedicalDocumentsRepository implements IMedicalDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.MedicalDocumentCreateInput,
  ): Promise<MedicalDocument> {
    return this.prisma.medicalDocument.create({ data });
  }

  async findAllForPatient(
    clinicId: string,
    patientId: string,
  ): Promise<MedicalDocument[]> {
    return this.prisma.medicalDocument.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clinicId: string): Promise<MedicalDocument | null> {
    return this.prisma.medicalDocument.findFirst({ where: { id, clinicId } });
  }

  async update(
    id: string,
    data: Prisma.MedicalDocumentUpdateInput,
  ): Promise<MedicalDocument> {
    return this.prisma.medicalDocument.update({ where: { id }, data });
  }

  async delete(id: string): Promise<MedicalDocument> {
    return this.prisma.medicalDocument.delete({ where: { id } });
  }
}
