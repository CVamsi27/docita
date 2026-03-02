import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';

interface CreateTemplateData {
  name: string;
  speciality: string;
  fields: Record<string, unknown>[];
  defaultObservations?: string;
  clinicId?: string;
}

interface UpdateTemplateData {
  name?: string;
  speciality?: string;
  fields?: Record<string, unknown>[];
  defaultObservations?: string;
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  create(data: CreateTemplateData) {
    return this.prisma.clinicalTemplate.create({
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: this.toInputJsonValue(data.fields),
        defaultObservations: data.defaultObservations,
        clinicId: data.clinicId,
      },
    });
  }

  findAll(params?: {
    search?: string;
    speciality?: string;
    clinicId?: string;
  }) {
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
    });
  }

  findOne(id: string) {
    return this.prisma.clinicalTemplate.findUnique({
      where: { id },
    });
  }

  update(id: string, data: UpdateTemplateData) {
    return this.prisma.clinicalTemplate.update({
      where: { id },
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: data.fields ? this.toInputJsonValue(data.fields) : undefined,
        defaultObservations: data.defaultObservations,
      },
    });
  }

  remove(id: string) {
    return this.prisma.clinicalTemplate.delete({
      where: { id },
    });
  }
}
