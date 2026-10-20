import { Test } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { PatientTimelineSourceRegistry } from './patient-timeline-source.registry';
import { PATIENT_TIMELINE_SOURCE_CLASSES } from '@/domains/patients/infrastructure/persistence/timeline/prisma-patient-timeline-sources';

describe('PatientTimelineSourceRegistry dependency injection', () => {
  it('fetches retained clinical rows through all Nest-created source providers', async () => {
    const appointment = {
      id: 'appointment-fixture',
      startTime: new Date('2026-10-10T10:00:00.000Z'),
    };
    const readClient = {
      appointment: { findMany: jest.fn(async () => [appointment]) },
      prescription: { findMany: jest.fn(async () => []) },
      patientMetricRecord: { findMany: jest.fn(async () => []) },
      labTestOrder: { findMany: jest.fn(async () => []) },
      medicalDocument: { findMany: jest.fn(async () => []) },
      followUp: { findMany: jest.fn(async () => []) },
      immunization: { findMany: jest.fn(async () => []) },
      admission: { findMany: jest.fn(async () => []) },
      medicationDose: { findMany: jest.fn(async () => []) },
    };
    const module = await Test.createTestingModule({
      providers: [
        PatientTimelineSourceRegistry,
        ...PATIENT_TIMELINE_SOURCE_CLASSES,
        {
          provide: PrismaService,
          useValue: { getReadClient: () => readClient },
        },
      ],
    }).compile();

    try {
      const registry = module.get(PatientTimelineSourceRegistry);
      const results = await registry.fetchRawByType(
        [
          'APPOINTMENT',
          'PRESCRIPTION',
          'METRIC_RECORD',
          'LAB_TEST',
          'MEDICAL_DOCUMENT',
          'FOLLOW_UP',
          'IMMUNIZATION',
          'ADMISSION',
          'MEDICATION_DOSE',
        ],
        { patientId: 'patient-fixture', clinicId: 'clinic-fixture' },
      );

      expect(results).toHaveLength(9);
      expect(results.every((result) => result.status === 'fulfilled')).toBe(
        true,
      );
      expect(results).toContainEqual({
        status: 'fulfilled',
        value: { type: 'APPOINTMENT', items: [appointment] },
      });
      expect(readClient.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-fixture', clinicId: 'clinic-fixture' },
        }),
      );
    } finally {
      await module.close();
    }
  });
});
