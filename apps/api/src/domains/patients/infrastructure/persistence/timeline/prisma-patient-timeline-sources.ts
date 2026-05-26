import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { TimelineEventType } from '@/domains/patients/core/repositories/timeline/timeline-event.types';
import type {
  IPatientTimelineSource,
  TimelineFetchParams,
} from '@/domains/patients/core/repositories/timeline/timeline-fetch.types';
import { timelineDateRange } from './timeline-date-range.helper';

abstract class PrismaPatientTimelineSourceBase implements IPatientTimelineSource {
  abstract readonly eventType: TimelineEventType;

  constructor(protected readonly prisma: PrismaService) {}

  protected getReadClient() {
    return this.prisma.getReadClient();
  }

  abstract fetch(params: TimelineFetchParams): Promise<unknown[]>;
}

@Injectable()
export class AppointmentsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'APPOINTMENT' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().appointment.findMany({
      where: {
        patientId,
        clinicId,
        ...timelineDateRange('startTime', from, to),
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
}

@Injectable()
export class PrescriptionsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'PRESCRIPTION' as const;

  fetch({ patientId, from, to }: TimelineFetchParams) {
    return this.getReadClient().prescription.findMany({
      where: { patientId, ...timelineDateRange('date', from, to) },
      include: { medications: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }
}

@Injectable()
export class MetricRecordsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'METRIC_RECORD' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().patientMetricRecord.findMany({
      where: {
        patientId,
        clinicId,
        ...timelineDateRange('recordedAt', from, to),
      },
      include: {
        values: {
          include: { option: { select: { label: true } } },
          take: 3,
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }
}

@Injectable()
export class LabTestsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'LAB_TEST' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().labTestOrder.findMany({
      where: {
        patientId,
        clinicId,
        ...timelineDateRange('createdAt', from, to),
      },
      include: { labTest: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

@Injectable()
export class MedicalDocumentsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'MEDICAL_DOCUMENT' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().medicalDocument.findMany({
      where: {
        patientId,
        clinicId,
        ...timelineDateRange('createdAt', from, to),
      },
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
}

@Injectable()
export class FollowUpsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'FOLLOW_UP' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().followUp.findMany({
      where: {
        patientId,
        clinicId,
        ...timelineDateRange('scheduledDate', from, to),
      },
      select: { id: true, reason: true, scheduledDate: true, status: true },
      orderBy: { scheduledDate: 'desc' },
      take: 50,
    });
  }
}

@Injectable()
export class ImmunizationsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'IMMUNIZATION' as const;

  fetch({ patientId, from, to }: TimelineFetchParams) {
    return this.getReadClient().immunization.findMany({
      where: {
        patientId,
        ...timelineDateRange('administeredDate', from, to),
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
}

@Injectable()
export class AdmissionsTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'ADMISSION' as const;

  fetch({ patientId, from, to }: TimelineFetchParams) {
    return this.getReadClient().admission.findMany({
      where: { patientId, ...timelineDateRange('admittedAt', from, to) },
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
}

@Injectable()
export class MedicationDosesTimelineSource extends PrismaPatientTimelineSourceBase {
  readonly eventType = 'MEDICATION_DOSE' as const;

  fetch({ patientId, clinicId, from, to }: TimelineFetchParams) {
    return this.getReadClient().medicationDose.findMany({
      where: {
        patientId,
        clinicId,
        status: { in: ['TAKEN', 'ADMINISTERED', 'MISSED'] },
        ...timelineDateRange('scheduledAt', from, to),
      },
      include: { medication: { select: { name: true } } },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
  }
}

export const PATIENT_TIMELINE_SOURCE_CLASSES = [
  AppointmentsTimelineSource,
  PrescriptionsTimelineSource,
  MetricRecordsTimelineSource,
  LabTestsTimelineSource,
  MedicalDocumentsTimelineSource,
  FollowUpsTimelineSource,
  ImmunizationsTimelineSource,
  AdmissionsTimelineSource,
  MedicationDosesTimelineSource,
] as const;
