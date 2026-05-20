import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
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

  create(data: CreateTemplateData): Promise<TemplateRecord> {
    return this.prisma.clinicalTemplate.create({
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: this.toInputJsonValue(data.fields),
        defaultObservations: data.defaultObservations,
        clinicId: data.clinicId,
      },
    }) as Promise<TemplateRecord>;
  }

  findAll(params?: TemplateQuery): Promise<TemplateRecord[]> {
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

    return this.prisma.clinicalTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<TemplateRecord[]>;
  }

  findById(id: string): Promise<TemplateRecord | null> {
    return this.prisma.clinicalTemplate.findUnique({
      where: { id },
    }) as Promise<TemplateRecord | null>;
  }

  update(id: string, data: UpdateTemplateData): Promise<TemplateRecord> {
    return this.prisma.clinicalTemplate.update({
      where: { id },
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: data.fields ? this.toInputJsonValue(data.fields) : undefined,
        defaultObservations: data.defaultObservations,
      },
    }) as Promise<TemplateRecord>;
  }

  delete(id: string): Promise<TemplateRecord> {
    return this.prisma.clinicalTemplate.delete({
      where: { id },
    }) as Promise<TemplateRecord>;
  }
}
