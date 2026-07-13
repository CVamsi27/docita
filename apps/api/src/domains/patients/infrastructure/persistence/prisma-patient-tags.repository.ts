import { Injectable } from '@nestjs/common';
import type { PatientTag } from '@workspace/types';

import { PrismaService } from '@/prisma/prisma.service';
import type { IPatientTagsRepository } from '@/domains/patients/core/repositories/patient-tags.repository.interface';

@Injectable()
export class PrismaPatientTagsRepository implements IPatientTagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async patientExists(params: {
    clinicId: string;
    patientId: string;
  }): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: params.patientId, clinicId: params.clinicId },
      select: { id: true },
    });
    return !!patient;
  }

  async findTag(params: {
    patientId: string;
    tagId: string;
  }): Promise<PatientTag | null> {
    return this.prisma.patientTag.findFirst({
      where: { id: params.tagId, patientId: params.patientId },
      select: { id: true, tag: true, color: true },
    });
  }

  async list(params: { patientId: string }): Promise<PatientTag[]> {
    return this.prisma.patientTag.findMany({
      where: { patientId: params.patientId },
      orderBy: { tag: 'asc' },
      select: { id: true, tag: true, color: true },
      // No `take`: bounded by patientId. Tags are a hand-curated, small
      // per-patient set; the UI renders the whole list.
    });
  }

  async create(params: {
    patientId: string;
    tag: string;
    color: string;
  }): Promise<PatientTag> {
    return this.prisma.patientTag.create({
      data: {
        patientId: params.patientId,
        tag: params.tag,
        color: params.color,
      },
      select: { id: true, tag: true, color: true },
    });
  }

  async update(params: {
    tagId: string;
    tag?: string;
    color?: string;
  }): Promise<PatientTag> {
    return this.prisma.patientTag.update({
      where: { id: params.tagId },
      data: {
        ...(params.tag !== undefined ? { tag: params.tag } : {}),
        ...(params.color !== undefined ? { color: params.color } : {}),
      },
      select: { id: true, tag: true, color: true },
    });
  }

  async remove(params: { tagId: string }): Promise<void> {
    await this.prisma.patientTag.delete({ where: { id: params.tagId } });
  }
}
