import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

interface CreateCustomFieldData {
  name: string;
  fieldType: string;
  required?: boolean;
  options?: string;
  order?: number;
  clinicId?: string;
}

interface UpdateCustomFieldData {
  name?: string;
  fieldType?: string;
  required?: boolean;
  options?: string;
  order?: number;
}

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId?: string) {
    return this.prisma.customField.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, clinicId?: string) {
    const field = await this.prisma.customField.findUnique({
      where: { id },
    });
    if (!field || (clinicId && field.clinicId !== clinicId)) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }
    return field;
  }

  async create(data: CreateCustomFieldData) {
    return this.prisma.customField.create({
      data,
    });
  }

  async update(id: string, data: UpdateCustomFieldData, clinicId?: string) {
    await this.findOne(id, clinicId);
    return this.prisma.customField.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, clinicId?: string) {
    await this.findOne(id, clinicId);
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
