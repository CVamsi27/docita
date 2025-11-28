import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@workspace/db';

interface TemplateField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface CreateTemplateData {
  name: string;
  speciality: string;
  fields: TemplateField[];
  defaultObservations?: string;
  clinicId?: string;
}

interface UpdateTemplateData {
  name?: string;
  speciality?: string;
  fields?: TemplateField[];
  defaultObservations?: string;
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateTemplateData) {
    return this.prisma.clinicalTemplate.create({
      data: {
        name: data.name,
        speciality: data.speciality,
        fields: data.fields as unknown as Prisma.InputJsonValue,
        defaultObservations: data.defaultObservations,
        clinicId: data.clinicId,
      },
    });
  }

  findAll() {
    return this.prisma.clinicalTemplate.findMany({
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
        fields: data.fields
          ? (data.fields as unknown as Prisma.InputJsonValue)
          : undefined,
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
