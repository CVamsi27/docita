import { Injectable } from '@nestjs/common';
import { clinicalTemplateFieldsSchema } from '@workspace/types';
import { ClinicalTemplate, Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  CreateTemplateData,
  ITemplatesRepository,
  TemplateQuery,
  TemplateRecord,
  UpdateTemplateData,
} from '@/domains/documents/application/ports/templates.repository.port';

@Injectable()
export class PrismaTemplatesRepository implements ITemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private mapRecord(row: ClinicalTemplate): TemplateRecord {
    return {
      ...row,
      fields:
        parsePrismaJsonColumn(row.fields, clinicalTemplateFieldsSchema) ?? [],
    };
  }

  async create(data: CreateTemplateData): Promise<TemplateRecord> {
    const row = await this.prisma.clinicalTemplate.create({
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: this.toInputJsonValue(data.fields),
        defaultObservations: data.defaultObservations,
        clinicId: data.clinicId,
      },
    });
    return this.mapRecord(row);
  }

  async findAll(params?: TemplateQuery): Promise<TemplateRecord[]> {
    const { search, speciality, clinicId } = params || {};
    const where: Prisma.ClinicalTemplateWhereInput = {};

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (speciality && speciality !== 'all') {
      where.speciality = speciality;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const rows = await this.prisma.clinicalTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.mapRecord(row));
  }

  async findById(id: string): Promise<TemplateRecord | null> {
    const row = await this.prisma.clinicalTemplate.findUnique({
      where: { id },
    });
    return row ? this.mapRecord(row) : null;
  }

  async update(id: string, data: UpdateTemplateData): Promise<TemplateRecord> {
    const row = await this.prisma.clinicalTemplate.update({
      where: { id },
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: data.fields ? this.toInputJsonValue(data.fields) : undefined,
        defaultObservations: data.defaultObservations,
      },
    });
    return this.mapRecord(row);
  }

  async delete(id: string): Promise<TemplateRecord> {
    const row = await this.prisma.clinicalTemplate.delete({
      where: { id },
    });
    return this.mapRecord(row);
  }
}
