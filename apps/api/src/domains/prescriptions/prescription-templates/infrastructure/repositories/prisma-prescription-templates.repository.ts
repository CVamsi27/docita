import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreatePrescriptionTemplateData,
  IPrescriptionTemplatesRepository,
  PrescriptionTemplateRecord,
  UpdatePrescriptionTemplateData,
} from '@/domains/prescriptions/prescription-templates/application/ports/prescription-templates.repository.port';

@Injectable()
export class PrismaPrescriptionTemplatesRepository implements IPrescriptionTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  findAll(userId: string): Promise<PrescriptionTemplateRecord[]> {
    return this.prisma.prescriptionTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<PrescriptionTemplateRecord[]>;
  }

  findById(id: string): Promise<PrescriptionTemplateRecord | null> {
    return this.prisma.prescriptionTemplate.findUnique({
      where: { id },
    }) as Promise<PrescriptionTemplateRecord | null>;
  }

  create(
    userId: string,
    data: CreatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord> {
    return this.prisma.prescriptionTemplate.create({
      data: {
        name: data.name,
        medications: this.toInputJsonValue(data.medications),
        instructions: data.instructions,
        userId,
      },
    }) as Promise<PrescriptionTemplateRecord>;
  }

  update(
    id: string,
    data: UpdatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord> {
    return this.prisma.prescriptionTemplate.update({
      where: { id },
      data: {
        name: data.name,
        medications: data.medications
          ? this.toInputJsonValue(data.medications)
          : undefined,
        instructions: data.instructions,
      },
    }) as Promise<PrescriptionTemplateRecord>;
  }

  delete(id: string): Promise<PrescriptionTemplateRecord> {
    return this.prisma.prescriptionTemplate.delete({
      where: { id },
    }) as Promise<PrescriptionTemplateRecord>;
  }
}
