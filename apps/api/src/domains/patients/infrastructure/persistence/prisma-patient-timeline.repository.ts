import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IPatientTimelineRepository } from '@/domains/patients/core/repositories/patient-timeline.repository.interface';

type PrismaWithOptional = PrismaService & {
  patientMetricRecord?: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  immunization?: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

function dateRange(
  field: string,
  from?: Date,
  to?: Date,
): Record<string, unknown> {
  if (!from && !to) return {};
  const range: Record<string, Date> = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return { [field]: range };
}

@Injectable()
export class PrismaPatientTimelineRepository implements IPatientTimelineRepository {
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

  async fetchAppointments(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.appointment.findMany({
      where: {
        patientId,
        clinicId,
        ...dateRange('startTime', from, to),
      },
      select: {
        id: true,
        startTime: true,
        chiefComplaint: true,
        finalDiagnosis: true,
        status: true,
        type: true,
        treatmentPlan: true,
        observations: true,
        doctor: { select: { id: true, name: true } },
        vitalSign: {
          select: {
            systolicBP: true,
            diastolicBP: true,
            pulse: true,
            temperature: true,
            spo2: true,
            weight: true,
            height: true,
          },
        },
        prescription: {
          select: {
            id: true,
            medications: {
              select: { name: true, dosage: true, frequency: true },
            },
          },
        },
        diagnoses: {
          select: {
            id: true,
            isPrimary: true,
            notes: true,
            icdCode: { select: { code: true, description: true } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
  }

  async fetchPrescriptions(
    patientId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.prescription.findMany({
      where: { patientId, ...dateRange('date', from, to) },
      include: { medications: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  async fetchMetricRecords(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    const extended = this.prisma as unknown as PrismaWithOptional;
    if (!extended.patientMetricRecord) return [];

    return extended.patientMetricRecord.findMany({
      where: { patientId, clinicId, ...dateRange('recordedAt', from, to) },
      include: {
        values: {
          include: { definition: { select: { label: true } } },
          take: 3,
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  async fetchLabTests(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.labTestOrder.findMany({
      where: { patientId, clinicId, ...dateRange('createdAt', from, to) },
      include: { labTest: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async fetchMedicalDocuments(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.medicalDocument.findMany({
      where: { patientId, clinicId, ...dateRange('createdAt', from, to) },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async fetchFollowUps(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.followUp.findMany({
      where: {
        patientId,
        clinicId,
        ...dateRange('scheduledDate', from, to),
      },
      select: { id: true, reason: true, scheduledDate: true, status: true },
      orderBy: { scheduledDate: 'desc' },
      take: 50,
    });
  }

  async fetchImmunizations(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    const extended = this.prisma as unknown as PrismaWithOptional;
    if (!extended.immunization) return [];

    return extended.immunization.findMany({
      where: {
        patientId,
        clinicId,
        ...dateRange('administeredDate', from, to),
      },
      select: {
        id: true,
        vaccineName: true,
        administeredDate: true,
        lotNumber: true,
        notes: true,
      },
      orderBy: { administeredDate: 'desc' },
      take: 50,
    });
  }

  async fetchAdmissions(
    patientId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.admission.findMany({
      where: { patientId, ...dateRange('admittedAt', from, to) },
      select: {
        id: true,
        admittedAt: true,
        dischargedAt: true,
        reason: true,
        diagnosis: true,
        status: true,
      },
      orderBy: { admittedAt: 'desc' },
      take: 20,
    });
  }

  async fetchMedicationDoses(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]> {
    return this.prisma.medicationDose.findMany({
      where: {
        patientId,
        clinicId,
        status: { in: ['TAKEN', 'ADMINISTERED', 'MISSED'] },
        ...dateRange('scheduledAt', from, to),
      },
      include: { medication: { select: { name: true } } },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
  }

  async fetchPatientConditions(patientId: string): Promise<unknown[]> {
    return this.prisma.patientMedicalCondition.findMany({
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
    return this.prisma.patientAllergy.findMany({
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
    return this.prisma.prescription.findMany({
      where: { patientId },
      include: { medications: true },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async fetchLatestVitals(
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null> {
    return this.prisma.vitalSign.findFirst({
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
    return this.prisma.medicationDose.groupBy({
      by: ['status'],
      where: { medicationId, patientId, clinicId },
      _count: { status: true },
    }) as unknown as Promise<
      Array<{ status: string; _count: { status: number } }>
    >;
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

    return this.prisma.medicationDose.groupBy({
      by: ['medicationId', 'status'],
      where: {
        medicationId: { in: medicationIds },
        patientId,
        clinicId,
      },
      _count: { status: true },
    }) as unknown as Promise<
      Array<{
        medicationId: string;
        status: string;
        _count: { status: number };
      }>
    >;
  }
}
