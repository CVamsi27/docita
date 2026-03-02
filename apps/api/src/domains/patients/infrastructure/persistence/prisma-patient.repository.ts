import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPatientRepository,
  PatientSearchParams,
} from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { PatientMapper } from '@/domains/patients/infrastructure/mappers/patient.mapper';
import { Prisma, Gender } from '@workspace/db';

@Injectable()
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Patient | null> {
    const item = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!item) return null;
    return PatientMapper.toDomain(item);
  }

  async findByMrn(mrn: string, clinicId: string): Promise<Patient | null> {
    const item = await this.prisma.patient.findFirst({
      where: { mrn, clinicId },
    });
    if (!item) return null;
    return PatientMapper.toDomain(item);
  }

  async findAll(
    params: PatientSearchParams,
  ): Promise<{ items: Patient[]; total: number }> {
    const { clinicId, search, gender, page = 1, limit = 20 } = params;

    const where: Prisma.PatientWhereInput = {
      clinicId,
    };

    if (gender) where.gender = gender as Gender;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { mrn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((item) => PatientMapper.toDomain(item)),
      total,
    };
  }

  async save(patient: Patient): Promise<void> {
    const data = PatientMapper.toPersistence(patient);
    await this.prisma.patient.create({
      data: data as Prisma.PatientUncheckedCreateInput,
    });
  }

  async update(patient: Patient): Promise<void> {
    const data = PatientMapper.toPersistence(patient);
    const { id, ...updateData } = data;
    if (!id || typeof id !== 'string') {
      throw new Error('Patient id is required for update');
    }
    await this.prisma.patient.update({
      where: { id },
      data: {
        ...(updateData as Prisma.PatientUncheckedUpdateInput),
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.patient.delete({ where: { id } });
  }
}
