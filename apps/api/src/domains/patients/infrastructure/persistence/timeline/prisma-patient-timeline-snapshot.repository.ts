import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IPatientTimelineSnapshotRepository } from '@/domains/patients/core/repositories/timeline/patient-timeline-snapshot.repository.interface';

@Injectable()
export class PrismaPatientTimelineSnapshotRepository
  implements IPatientTimelineSnapshotRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
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

  async fetchPatientConditions(patientId: string): Promise<unknown[]> {
    return this.getReadClient().patientMedicalCondition.findMany({
      where: { patientId, status: { in: ['ACTIVE', 'MANAGED'] } },
      select: {
        id: true,
        conditionName: true,
        status: true,
        severity: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async fetchPatientAllergies(patientId: string): Promise<unknown[]> {
    return this.getReadClient().patientAllergy.findMany({
      where: { patientId },
      select: {
        id: true,
        allergen: true,
        severity: true,
        allergyType: true,
      },
      orderBy: { severity: 'desc' },
      take: 10,
    });
  }

  async fetchRecentPrescriptionsWithMedications(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.getReadClient().prescription.findMany({
      where: { patientId },
      select: {
        id: true,
        date: true,
        approvalStatus: true,
        medications: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            duration: true,
            route: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async fetchLatestVitals(
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null> {
    return this.getReadClient().vitalSign.findFirst({
      where: { appointment: { patientId, clinicId } },
      orderBy: { createdAt: 'desc' },
      select: {
        systolicBP: true,
        diastolicBP: true,
        pulse: true,
        temperature: true,
        spo2: true,
        weight: true,
        createdAt: true,
      },
    });
  }

  async groupMedicationDosesByStatus(
    patientId: string,
    clinicId: string,
    medicationId: string,
  ): Promise<Array<{ status: string; _count: { status: number } }>> {
    const rows = await this.getReadClient().medicationDose.groupBy({
      by: ['status'],
      where: { medicationId, patientId, clinicId },
      _count: { status: true },
    });

    return rows.map((row) => ({
      status: row.status,
      _count: { status: row._count.status },
    }));
  }

  async groupMedicationDosesByMedicationIds(
    patientId: string,
    clinicId: string,
    medicationIds: string[],
  ): Promise<
    Array<{ medicationId: string; status: string; _count: { status: number } }>
  > {
    if (medicationIds.length === 0) {
      return [];
    }

    const rows = await this.getReadClient().medicationDose.groupBy({
      by: ['medicationId', 'status'],
      where: {
        medicationId: { in: medicationIds },
        patientId,
        clinicId,
      },
      _count: { status: true },
    });

    return rows.map((row) => ({
      medicationId: row.medicationId,
      status: row.status,
      _count: { status: row._count.status },
    }));
  }
}
