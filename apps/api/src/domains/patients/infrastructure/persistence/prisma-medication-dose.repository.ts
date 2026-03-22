import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IMedicationDoseRepository,
  MedicationWithPrescription,
  DoseAdherenceStat,
} from '@/domains/patients/core/repositories/medication-dose.repository.interface';

@Injectable()
export class PrismaMedicationDoseRepository implements IMedicationDoseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async verifyPatientAccess(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
      select: { id: true },
    });
    return !!patient;
  }

  async findMedicationWithPrescription(
    medicationId: string,
  ): Promise<MedicationWithPrescription | null> {
    return this.prisma.medication.findFirst({
      where: { id: medicationId },
      include: {
        prescription: { select: { id: true, patientId: true, date: true } },
      },
    }) as Promise<MedicationWithPrescription | null>;
  }

  async createDose(data: Prisma.MedicationDoseUncheckedCreateInput) {
    return this.prisma.medicationDose.create({ data });
  }

  async findDoseById(id: string, patientId: string, clinicId: string) {
    return this.prisma.medicationDose.findFirst({
      where: { id, patientId, clinicId },
    });
  }

  async updateDose(id: string, data: Prisma.MedicationDoseUpdateInput) {
    return this.prisma.medicationDose.update({ where: { id }, data });
  }

  async findDoses(
    where: Record<string, unknown>,
    options: { take: number; skip: number },
  ): Promise<unknown[]> {
    return this.prisma.medicationDose.findMany({
      where,
      include: {
        medication: { select: { name: true, dosage: true, frequency: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: options.take,
      skip: options.skip,
    });
  }

  async countDoses(where: Record<string, unknown>): Promise<number> {
    return this.prisma.medicationDose.count({ where });
  }

  async groupDosesByStatus(
    where: Record<string, unknown>,
  ): Promise<DoseAdherenceStat[]> {
    return this.prisma.medicationDose.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }) as unknown as Promise<DoseAdherenceStat[]>;
  }

  async createManyDoses(
    data: Array<Prisma.MedicationDoseUncheckedCreateInput>,
  ) {
    return this.prisma.medicationDose.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async findPrescriptionsWithMedications(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.prescription.findMany({
      where: { patientId },
      include: { medications: true },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async findPrescriptionById(
    id: string,
    patientId: string,
  ): Promise<unknown | null> {
    return this.prisma.prescription.findFirst({
      where: { id, patientId },
      include: { medications: true },
    });
  }
}
