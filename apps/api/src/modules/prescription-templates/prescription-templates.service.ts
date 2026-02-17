import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@workspace/db';

interface MedicationData {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface CreateTemplateData {
  name: string;
  medications: MedicationData[];
  instructions?: string;
}

interface UpdateTemplateData {
  name?: string;
  medications?: MedicationData[];
  instructions?: string;
}

@Injectable()
export class PrescriptionTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.prescriptionTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const template = await this.prisma.prescriptionTemplate.findUnique({
      where: { id },
    });
    if (!template || (userId && template.userId !== userId)) {
      throw new NotFoundException(
        `Prescription template with ID ${id} not found`,
      );
    }
    return template;
  }

  async create(userId: string, data: CreateTemplateData) {
    return this.prisma.prescriptionTemplate.create({
      data: {
        name: data.name,
        medications: data.medications as unknown as Prisma.InputJsonValue,
        instructions: data.instructions,
        userId,
      },
    });
  }

  async update(id: string, data: UpdateTemplateData, userId?: string) {
    await this.findOne(id, userId);
    return this.prisma.prescriptionTemplate.update({
      where: { id },
      data: {
        name: data.name,
        medications: data.medications
          ? (data.medications as unknown as Prisma.InputJsonValue)
          : undefined,
        instructions: data.instructions,
      },
    });
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id, userId);
    return this.prisma.prescriptionTemplate.delete({
      where: { id },
    });
  }
}
