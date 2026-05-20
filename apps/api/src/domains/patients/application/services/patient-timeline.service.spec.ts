import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { PatientTimelineService } from './patient-timeline.service';
import { PatientTimelineQueryService } from './patient-timeline-query.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { PatientTimelineSourceRegistry } from './patient-timeline-source.registry';
import { PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN } from '@/domains/patients/core/repositories/timeline/patient-timeline-snapshot.repository.interface';
import type { TimelineEventType } from '@/domains/patients/core/repositories/timeline/timeline-event.types';

describe('PatientTimelineService', () => {
  let service: PatientTimelineService;
  let snapshotRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;
  let timelineSources: {
    fetchRawByType: jest.Mock<
      (
        types: TimelineEventType[],
        params: unknown,
      ) => Promise<
        PromiseSettledResult<{ type: TimelineEventType; items: unknown[] }>[]
      >
    >;
  };

  const mockDate = new Date('2026-03-21T10:00:00Z');
  const olderDate = new Date('2026-03-15T10:00:00Z');

  beforeEach(async () => {
    snapshotRepository = {
      verifyPatientAccess: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchPatientConditions:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchPatientAllergies: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchRecentPrescriptionsWithMedications:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchLatestVitals: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      groupMedicationDosesByStatus:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      groupMedicationDosesByMedicationIds:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    timelineSources = {
      fetchRawByType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientTimelineQueryService,
        PatientTimelineService,
        {
          provide: PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN,
          useValue: snapshotRepository,
        },
        {
          provide: PatientTimelineSourceRegistry,
          useValue: timelineSources,
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-03-21T10:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get<PatientTimelineService>(PatientTimelineService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTimeline', () => {
    beforeEach(() => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(true);
      timelineSources.fetchRawByType.mockResolvedValue([]);
    });

    it('should throw NotFoundException when patient not found', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(false);

      await expect(
        service.getTimeline('clinic-1', 'patient-x', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should aggregate events from all sources and sort by date desc', async () => {
      timelineSources.fetchRawByType.mockResolvedValue([
        {
          status: 'fulfilled',
          value: {
            type: 'APPOINTMENT',
            items: [
              {
                id: 'appt-1',
                startTime: mockDate,
                chiefComplaint: 'Headache',
                finalDiagnosis: null,
                status: 'COMPLETED',
                type: 'GENERAL',
              },
            ],
          },
        },
        {
          status: 'fulfilled',
          value: {
            type: 'PRESCRIPTION',
            items: [
              {
                id: 'rx-1',
                date: olderDate,
                medications: [{ name: 'Amoxicillin' }],
              },
            ],
          },
        },
      ]);

      const result = await service.getTimeline('clinic-1', 'patient-1', {});

      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.type).toBe('APPOINTMENT');
      expect(result.events[1]?.type).toBe('PRESCRIPTION');
      expect(result.total).toBe(2);
      expect(result.summary['APPOINTMENT']).toBe(1);
      expect(result.summary['PRESCRIPTION']).toBe(1);
    });

    it('should filter by eventTypes when specified', async () => {
      await service.getTimeline('clinic-1', 'patient-1', {
        eventTypes: ['APPOINTMENT'],
      });

      expect(timelineSources.fetchRawByType).toHaveBeenCalledWith(
        ['APPOINTMENT'],
        expect.objectContaining({
          patientId: 'patient-1',
          clinicId: 'clinic-1',
        }),
      );
    });

    it('should paginate results correctly', async () => {
      const appointments = Array.from({ length: 5 }, (_, i) => ({
        id: `appt-${i}`,
        startTime: new Date(`2026-03-${15 + i}T10:00:00Z`),
        chiefComplaint: `Complaint ${i}`,
        finalDiagnosis: null,
        status: 'COMPLETED',
        type: 'GENERAL',
      }));
      timelineSources.fetchRawByType.mockResolvedValue([
        {
          status: 'fulfilled',
          value: { type: 'APPOINTMENT', items: appointments },
        },
      ]);

      const result = await service.getTimeline('clinic-1', 'patient-1', {
        limit: 2,
        offset: 1,
      });

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should handle individual fetcher failures gracefully', async () => {
      timelineSources.fetchRawByType.mockResolvedValue([
        { status: 'rejected', reason: new Error('DB error') },
        {
          status: 'fulfilled',
          value: {
            type: 'PRESCRIPTION',
            items: [
              {
                id: 'rx-ok',
                date: mockDate,
                medications: [{ name: 'Med A' }],
              },
            ],
          },
        },
      ]);

      const result = await service.getTimeline('clinic-1', 'patient-1', {
        eventTypes: ['APPOINTMENT', 'PRESCRIPTION'],
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.type).toBe('PRESCRIPTION');
    });

    it('should build correct summary counts per type', async () => {
      timelineSources.fetchRawByType.mockResolvedValue([
        {
          status: 'fulfilled',
          value: {
            type: 'APPOINTMENT',
            items: [
              {
                id: 'a1',
                startTime: mockDate,
                chiefComplaint: 'C1',
                finalDiagnosis: null,
                status: 'COMPLETED',
                type: 'GENERAL',
              },
              {
                id: 'a2',
                startTime: olderDate,
                chiefComplaint: 'C2',
                finalDiagnosis: null,
                status: 'SCHEDULED',
                type: 'GENERAL',
              },
            ],
          },
        },
      ]);

      const result = await service.getTimeline('clinic-1', 'patient-1', {
        eventTypes: ['APPOINTMENT'],
      });

      expect(result.summary['APPOINTMENT']).toBe(2);
      expect(result.summary['PRESCRIPTION']).toBeUndefined();
    });
  });

  describe('getPatientSnapshot', () => {
    it('should throw NotFoundException when patient not found', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(false);

      await expect(
        service.getPatientSnapshot('clinic-1', 'patient-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return snapshot with conditions, allergies, active medications, vitals', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(true);
      snapshotRepository.fetchPatientConditions.mockResolvedValue([
        {
          id: 'cond-1',
          conditionName: 'Hypertension',
          status: 'ACTIVE',
          severity: 'MODERATE',
        },
      ]);
      snapshotRepository.fetchPatientAllergies.mockResolvedValue([
        {
          id: 'allergy-1',
          allergen: 'Penicillin',
          severity: 'SEVERE',
          allergyType: 'DRUG',
        },
      ]);
      snapshotRepository.fetchRecentPrescriptionsWithMedications.mockResolvedValue(
        [
          {
            id: 'rx-1',
            date: mockDate,
            medications: [
              {
                id: 'med-1',
                name: 'Lisinopril',
                dosage: '10mg',
                frequency: 'Once daily',
                isPRN: false,
                endDate: null,
              },
            ],
          },
        ],
      );
      snapshotRepository.fetchLatestVitals.mockResolvedValue({
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 72,
        temperature: 98.6,
        spo2: 98,
        weight: 70,
        createdAt: mockDate,
      });
      snapshotRepository.groupMedicationDosesByMedicationIds.mockResolvedValue([
        { medicationId: 'med-1', status: 'TAKEN', _count: { status: 9 } },
        { medicationId: 'med-1', status: 'MISSED', _count: { status: 1 } },
      ]);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(snapshot.activeConditions).toHaveLength(1);
      expect(snapshot.activeConditions[0]?.conditionName).toBe('Hypertension');

      expect(snapshot.activeAllergies).toHaveLength(1);
      expect(snapshot.activeAllergies[0]?.allergen).toBe('Penicillin');

      expect(snapshot.activeMedications).toHaveLength(1);
      expect(snapshot.activeMedications[0]?.name).toBe('Lisinopril');
      expect(snapshot.activeMedications[0]?.adherenceRate).toBe(90);

      expect(snapshot.latestVitals).not.toBeNull();
      expect(snapshot.latestVitals?.systolicBP).toBe(120);
      expect(snapshot.latestVitals?.pulse).toBe(72);
    });

    it('should return null latestVitals when no vitals recorded', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(true);
      snapshotRepository.fetchPatientConditions.mockResolvedValue([]);
      snapshotRepository.fetchPatientAllergies.mockResolvedValue([]);
      snapshotRepository.fetchRecentPrescriptionsWithMedications.mockResolvedValue(
        [],
      );
      snapshotRepository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(snapshot.latestVitals).toBeNull();
    });

    it('should exclude expired medications from active list', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(true);
      snapshotRepository.fetchPatientConditions.mockResolvedValue([]);
      snapshotRepository.fetchPatientAllergies.mockResolvedValue([]);
      snapshotRepository.fetchRecentPrescriptionsWithMedications.mockResolvedValue(
        [
          {
            id: 'rx-old',
            date: olderDate,
            medications: [
              {
                id: 'med-expired',
                name: 'Old Drug',
                dosage: '5mg',
                frequency: 'Daily',
                isPRN: false,
                endDate: new Date('2026-03-01'),
              },
            ],
          },
        ],
      );
      snapshotRepository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(snapshot.activeMedications).toHaveLength(0);
    });

    it('should not fetch adherence for PRN medications', async () => {
      snapshotRepository.verifyPatientAccess.mockResolvedValue(true);
      snapshotRepository.fetchPatientConditions.mockResolvedValue([]);
      snapshotRepository.fetchPatientAllergies.mockResolvedValue([]);
      snapshotRepository.fetchRecentPrescriptionsWithMedications.mockResolvedValue(
        [
          {
            id: 'rx-prn',
            date: mockDate,
            medications: [
              {
                id: 'med-prn',
                name: 'Ibuprofen',
                dosage: '400mg',
                frequency: 'As needed',
                isPRN: true,
                endDate: null,
              },
            ],
          },
        ],
      );
      snapshotRepository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(
        snapshotRepository.groupMedicationDosesByMedicationIds,
      ).not.toHaveBeenCalled();
      expect(snapshot.activeMedications[0]?.adherenceRate).toBeNull();
    });
  });
});
