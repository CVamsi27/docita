import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PatientTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { clinicId: string; patientId: string }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: params.patientId, clinicId: params.clinicId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.patientTag.findMany({
      where: { patientId: params.patientId },
      orderBy: { tag: 'asc' },
    });
  }

  async create(params: {
    clinicId: string;
    patientId: string;
    tag: string;
    color: string;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: params.patientId, clinicId: params.clinicId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const normalizedTag = params.tag.trim();
    if (!normalizedTag) {
      throw new BadRequestException('Tag is required');
    }

    return this.prisma.patientTag.create({
      data: {
        patientId: params.patientId,
        tag: normalizedTag,
        color: params.color,
      },
    });
  }

  async update(params: {
    clinicId: string;
    patientId: string;
    tagId: string;
    tag?: string;
    color?: string;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: params.patientId, clinicId: params.clinicId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.prisma.patientTag.findFirst({
      where: { id: params.tagId, patientId: params.patientId },
    });
    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.patientTag.update({
      where: { id: params.tagId },
      data: {
        ...(params.tag !== undefined ? { tag: params.tag.trim() } : {}),
        ...(params.color !== undefined ? { color: params.color } : {}),
      },
    });
  }

  async remove(params: { clinicId: string; patientId: string; tagId: string }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: params.patientId, clinicId: params.clinicId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.prisma.patientTag.findFirst({
      where: { id: params.tagId, patientId: params.patientId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.patientTag.delete({ where: { id: params.tagId } });
  }
}
