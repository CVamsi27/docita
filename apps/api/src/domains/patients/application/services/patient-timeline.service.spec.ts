import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { PatientTimelineService } from './patient-timeline.service';
import { PATIENT_TIMELINE_REPOSITORY_TOKEN } from '@/domains/patients/core/repositories/patient-timeline.repository.interface';

describe('PatientTimelineService', () => {
  let service: PatientTimelineService;
  let repository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockDate = new Date('2026-03-21T10:00:00Z');
  const olderDate = new Date('2026-03-15T10:00:00Z');

  beforeEach(async () => {
    repository = {
      verifyPatientAccess: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchAppointments: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchPrescriptions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchMetricRecords: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchLabTests: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchMedicalDocuments:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchFollowUps: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchImmunizations: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchAdmissions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchMedicationDoses: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchPatientConditions:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchPatientAllergies:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchRecentPrescriptionsWithMedications:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetchLatestVitals: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      groupMedicationDosesByStatus:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientTimelineService,
        { provide: PATIENT_TIMELINE_REPOSITORY_TOKEN, useValue: repository },
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
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.fetchAppointments.mockResolvedValue([]);
      repository.fetchPrescriptions.mockResolvedValue([]);
      repository.fetchMetricRecords.mockResolvedValue([]);
      repository.fetchLabTests.mockResolvedValue([]);
      repository.fetchMedicalDocuments.mockResolvedValue([]);
      repository.fetchFollowUps.mockResolvedValue([]);
      repository.fetchImmunizations.mockResolvedValue([]);
      repository.fetchAdmissions.mockResolvedValue([]);
      repository.fetchMedicationDoses.mockResolvedValue([]);
    });

    it('should throw NotFoundException when patient not found', async () => {
      repository.verifyPatientAccess.mockResolvedValue(false);

      await expect(
        service.getTimeline('clinic-1', 'patient-x', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should aggregate events from all sources and sort by date desc', async () => {
      repository.fetchAppointments.mockResolvedValue([
        {
          id: 'appt-1',
          startTime: mockDate,
          chiefComplaint: 'Headache',
          finalDiagnosis: null,
          status: 'COMPLETED',
          type: 'GENERAL',
        },
      ]);
      repository.fetchPrescriptions.mockResolvedValue([
        {
          id: 'rx-1',
          date: olderDate,
          medications: [{ name: 'Amoxicillin' }],
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

      expect(repository.fetchAppointments).toHaveBeenCalled();
      expect(repository.fetchPrescriptions).not.toHaveBeenCalled();
      expect(repository.fetchMedicationDoses).not.toHaveBeenCalled();
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
      repository.fetchAppointments.mockResolvedValue(appointments);

      const result = await service.getTimeline('clinic-1', 'patient-1', {
        limit: 2,
        offset: 1,
      });

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should handle individual fetcher failures gracefully', async () => {
      repository.fetchAppointments.mockRejectedValue(new Error('DB error'));
      repository.fetchPrescriptions.mockResolvedValue([
        {
          id: 'rx-ok',
          date: mockDate,
          medications: [{ name: 'Med A' }],
        },
      ]);

      const result = await service.getTimeline('clinic-1', 'patient-1', {
        eventTypes: ['APPOINTMENT', 'PRESCRIPTION'],
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.type).toBe('PRESCRIPTION');
    });

    it('should build correct summary counts per type', async () => {
      repository.fetchAppointments.mockResolvedValue([
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
      repository.verifyPatientAccess.mockResolvedValue(false);

      await expect(
        service.getPatientSnapshot('clinic-1', 'patient-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return snapshot with conditions, allergies, active medications, vitals', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.fetchPatientConditions.mockResolvedValue([
        {
          id: 'cond-1',
          conditionName: 'Hypertension',
          status: 'ACTIVE',
          severity: 'MODERATE',
        },
      ]);
      repository.fetchPatientAllergies.mockResolvedValue([
        {
          id: 'allergy-1',
          allergen: 'Penicillin',
          severity: 'SEVERE',
          allergyType: 'DRUG',
        },
      ]);
      repository.fetchRecentPrescriptionsWithMedications.mockResolvedValue([
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
      ]);
      repository.fetchLatestVitals.mockResolvedValue({
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 72,
        temperature: 98.6,
        spo2: 98,
        weight: 70,
        createdAt: mockDate,
      });
      repository.groupMedicationDosesByStatus.mockResolvedValue([
        { status: 'TAKEN', _count: { status: 9 } },
        { status: 'MISSED', _count: { status: 1 } },
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
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.fetchPatientConditions.mockResolvedValue([]);
      repository.fetchPatientAllergies.mockResolvedValue([]);
      repository.fetchRecentPrescriptionsWithMedications.mockResolvedValue([]);
      repository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(snapshot.latestVitals).toBeNull();
    });

    it('should exclude expired medications from active list', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.fetchPatientConditions.mockResolvedValue([]);
      repository.fetchPatientAllergies.mockResolvedValue([]);
      repository.fetchRecentPrescriptionsWithMedications.mockResolvedValue([
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
      ]);
      repository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(snapshot.activeMedications).toHaveLength(0);
    });

    it('should not fetch adherence for PRN medications', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.fetchPatientConditions.mockResolvedValue([]);
      repository.fetchPatientAllergies.mockResolvedValue([]);
      repository.fetchRecentPrescriptionsWithMedications.mockResolvedValue([
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
      ]);
      repository.fetchLatestVitals.mockResolvedValue(null);

      const snapshot = await service.getPatientSnapshot(
        'clinic-1',
        'patient-1',
      );

      expect(repository.groupMedicationDosesByStatus).not.toHaveBeenCalled();
      expect(snapshot.activeMedications[0]?.adherenceRate).toBeNull();
    });
  });
});
