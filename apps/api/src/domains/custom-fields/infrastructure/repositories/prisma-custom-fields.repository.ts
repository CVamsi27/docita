import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateCustomFieldData,
  CustomFieldRecord,
  ICustomFieldsRepository,
  UpdateCustomFieldData,
} from '@/domains/custom-fields/application/ports/custom-fields.repository.port';

@Injectable()
export class PrismaCustomFieldsRepository implements ICustomFieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(clinicId?: string): Promise<CustomFieldRecord[]> {
    return this.prisma.customField.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { order: 'asc' },
    });
  }

  findById(id: string): Promise<CustomFieldRecord | null> {
    return this.prisma.customField.findUnique({
      where: { id },
    });
  }

  create(data: CreateCustomFieldData): Promise<CustomFieldRecord> {
    return this.prisma.customField.create({ data });
  }

  update(id: string, data: UpdateCustomFieldData): Promise<CustomFieldRecord> {
    return this.prisma.customField.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<CustomFieldRecord> {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
