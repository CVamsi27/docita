import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IMedicationDoseRepository,
  MedicationDoseHistoryRow,
  MedicationWithPrescription,
  DoseAdherenceStat,
  PrescriptionWithMedications,
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
    });
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
    where: Prisma.MedicationDoseWhereInput,
    options: { take: number; skip: number },
  ): Promise<MedicationDoseHistoryRow[]> {
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

  async countDoses(where: Prisma.MedicationDoseWhereInput): Promise<number> {
    return this.prisma.medicationDose.count({ where });
  }

  async groupDosesByStatus(
    where: Prisma.MedicationDoseWhereInput,
  ): Promise<DoseAdherenceStat[]> {
    const rows = await this.prisma.medicationDose.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    return rows.map((row) => ({
      status: row.status,
      _count: { status: row._count.status },
    }));
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
  ): Promise<PrescriptionWithMedications[]> {
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
  ): Promise<PrescriptionWithMedications | null> {
    return this.prisma.prescription.findFirst({
      where: { id, patientId },
      include: { medications: true },
    });
  }
}
