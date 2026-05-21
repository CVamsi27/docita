import { Injectable } from '@nestjs/common';
import { type PrescriptionTemplate } from '@workspace/db';
import { prescriptionTemplateMedicationsSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  CreatePrescriptionTemplateData,
  IPrescriptionTemplatesRepository,
  PrescriptionTemplateRecord,
  UpdatePrescriptionTemplateData,
} from '@/domains/prescriptions/prescription-templates/application/ports/prescription-templates.repository.port';

@Injectable()
export class PrismaPrescriptionTemplatesRepository implements IPrescriptionTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapRecord(raw: PrescriptionTemplate): PrescriptionTemplateRecord {
    const medications =
      parsePrismaJsonColumn(
        raw.medications,
        prescriptionTemplateMedicationsSchema,
      ) ?? [];

    return {
      ...raw,
      medications,
    };
  }

  async findAll(userId: string): Promise<PrescriptionTemplateRecord[]> {
    const rows = await this.prisma.prescriptionTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapRecord(row));
  }

  async findById(id: string): Promise<PrescriptionTemplateRecord | null> {
    const row = await this.prisma.prescriptionTemplate.findUnique({
      where: { id },
    });
    return row ? this.mapRecord(row) : null;
  }

  async create(
    userId: string,
    data: CreatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord> {
    const row = await this.prisma.prescriptionTemplate.create({
      data: {
        name: data.name,
        medications: toPrismaInputJsonValue(data.medications),
        instructions: data.instructions,
        userId,
      },
    });
    return this.mapRecord(row);
  }

  async update(
    id: string,
    data: UpdatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord> {
    const row = await this.prisma.prescriptionTemplate.update({
      where: { id },
      data: {
        name: data.name,
        medications: data.medications
          ? toPrismaInputJsonValue(data.medications)
          : undefined,
        instructions: data.instructions,
      },
    });
    return this.mapRecord(row);
  }

  async delete(id: string): Promise<PrescriptionTemplateRecord> {
    const row = await this.prisma.prescriptionTemplate.delete({
      where: { id },
    });
    return this.mapRecord(row);
  }
}
