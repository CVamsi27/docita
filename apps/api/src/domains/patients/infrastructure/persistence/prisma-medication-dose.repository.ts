import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaReadBase } from '@/shared/common/repositories/prisma-read-base';
import {
  IMedicationDoseRepository,
  MedicationDoseHistoryRow,
  MedicationWithPrescription,
  DoseAdherenceStat,
  PrescriptionWithMedications,
} from '@/domains/patients/core/repositories/medication-dose.repository.interface';

@Injectable()
// jscpd:ignore-start
export class PrismaMedicationDoseRepository
  extends PrismaReadBase
  implements IMedicationDoseRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async verifyPatientAccess(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const patient = await this.getReadClient().patient.findFirst({
      where: { id: patientId, clinicId },
      select: { id: true },
    });
    return !!patient;
  }

  async findMedicationWithPrescription(
    // jscpd:ignore-end
    medicationId: string,
  ): Promise<MedicationWithPrescription | null> {
    return this.getReadClient().medication.findFirst({
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
    return this.getReadClient().medicationDose.findFirst({
      where: { id, patientId, clinicId },
    });
  }

  async updateDose(
    id: string,
    data: Prisma.MedicationDoseUpdateInput,
    expectedVersion?: number,
  ) {
    // When the caller passes the version it read, gate the write on it so a
    // concurrent edit cannot silently win. Without a version, the existing
    // single-row update is preserved for backward compatibility.
    if (expectedVersion !== undefined) {
      const result = await this.prisma.medicationDose.updateMany({
        where: { id, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new Error(
          `MedicationDose ${id} version conflict (expected ${expectedVersion})`,
        );
      }
      const fresh = await this.prisma.medicationDose.findUniqueOrThrow({
        where: { id },
      });
      return fresh;
    }
    return this.prisma.medicationDose.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async findDoses(
    where: Prisma.MedicationDoseWhereInput,
    options: { take: number; skip: number },
  ): Promise<MedicationDoseHistoryRow[]> {
    return this.getReadClient().medicationDose.findMany({
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
    return this.getReadClient().medicationDose.count({ where });
  }

  async groupDosesByStatus(
    where: Prisma.MedicationDoseWhereInput,
  ): Promise<DoseAdherenceStat[]> {
    const rows = await this.getReadClient().medicationDose.groupBy({
      by: ['status'],
      // jscpd:ignore-start
      where,
      _count: { status: true },
    });

    return rows.map((row) => ({
      status: row.status,
      _count: { status: row._count.status },
    }));
  }

  async createManyDoses(
    // jscpd:ignore-end
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
    return this.getReadClient().prescription.findMany({
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
    return this.getReadClient().prescription.findFirst({
      where: { id, patientId },
      include: { medications: true },
    });
  }
}
