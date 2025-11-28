import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async findAll() {
    return this.prisma.customField.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.customField.findUnique({
      where: { id },
    });
  }

  async create(data: CreateCustomFieldData) {
    return this.prisma.customField.create({
      data,
    });
  }

  async update(id: string, data: UpdateCustomFieldData) {
    return this.prisma.customField.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
