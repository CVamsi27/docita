import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { MedicationDoseService } from './medication-dose.service';
import { MedicationDoseCommandService } from './medication-dose-command.service';
import { MedicationDoseQueryService } from './medication-dose-query.service';
import { MEDICATION_DOSE_REPOSITORY_TOKEN } from '@/domains/patients/core/repositories/medication-dose.repository.interface';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';

describe('MedicationDoseService', () => {
  let service: MedicationDoseService;
  let repository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  beforeEach(async () => {
    repository = {
      verifyPatientAccess: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMedicationWithPrescription:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createDose: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findDoseById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateDose: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findDoses: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      countDoses: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      groupDosesByStatus: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createManyDoses: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findPrescriptionsWithMedications:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findPrescriptionById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationDoseCommandService,
        MedicationDoseQueryService,
        MedicationDoseService,
        { provide: MEDICATION_DOSE_REPOSITORY_TOKEN, useValue: repository },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-03-21T10:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get<MedicationDoseService>(MedicationDoseService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordDose', () => {
    const clinicId = 'clinic-1';
    const patientId = 'patient-1';
    const dto = {
      medicationId: 'med-1',
      scheduledAt: new Date('2026-03-21T08:00:00Z'),
      status: 'PENDING' as const,
    };

    it('should create a dose record when medication belongs to patient', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.findMedicationWithPrescription.mockResolvedValue({
        id: 'med-1',
        prescriptionId: 'rx-1',
        prescription: { patientId },
      });
      repository.createDose.mockResolvedValue({
        id: 'dose-1',
        ...dto,
        patientId,
        clinicId,
      });

      const result = await service.recordDose(clinicId, patientId, dto);

      expect(repository.createDose).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationId: 'med-1',
          patientId,
          clinicId,
          source: 'CLINICIAN_RECORDED',
        }),
      );
      expect(result).toHaveProperty('id', 'dose-1');
    });

    it('should throw NotFoundException when patient not found', async () => {
      repository.verifyPatientAccess.mockResolvedValue(false);

      await expect(
        service.recordDose(clinicId, patientId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when medication does not belong to patient', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.findMedicationWithPrescription.mockResolvedValue({
        id: 'med-1',
        prescriptionId: 'rx-1',
        prescription: { patientId: 'other-patient' },
      });

      await expect(
        service.recordDose(clinicId, patientId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordAdHocDose', () => {
    const clinicId = 'clinic-1';
    const patientId = 'patient-1';
    const dto = { medicationId: 'med-prn', doseAmount: '1 tablet' };

    it('should record ad-hoc dose for PRN medication', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.findMedicationWithPrescription.mockResolvedValue({
        id: 'med-prn',
        name: 'Test Med',
        isPRN: true,
        prescriptionId: 'rx-1',
        prnMaxDose: null,
        prescription: { patientId },
      });
      repository.createDose.mockResolvedValue({
        id: 'dose-2',
        status: 'TAKEN',
        source: 'PATIENT_REPORTED',
      });

      const result = await service.recordAdHocDose(clinicId, patientId, dto);

      expect(repository.createDose).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'TAKEN',
          source: 'PATIENT_REPORTED',
        }),
      );
      expect(result).toHaveProperty('id', 'dose-2');
    });

    it('should throw BadRequestException for non-PRN medication', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.findMedicationWithPrescription.mockResolvedValue({
        id: 'med-prn',
        isPRN: false,
        prescriptionId: 'rx-1',
        prescription: { patientId },
      });

      await expect(
        service.recordAdHocDose(clinicId, patientId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDoseStatus', () => {
    it('should update dose status and auto-set takenAt for TAKEN', async () => {
      const existingDose = {
        id: 'dose-1',
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        takenAt: null,
      };
      repository.findDoseById.mockResolvedValue(existingDose);
      repository.updateDose.mockResolvedValue({
        ...existingDose,
        status: 'TAKEN',
        takenAt: new Date(),
      });

      await service.updateDoseStatus('clinic-1', 'patient-1', 'dose-1', {
        status: 'TAKEN',
      });

      expect(repository.updateDose).toHaveBeenCalledWith(
        'dose-1',
        expect.objectContaining({ status: 'TAKEN', takenAt: expect.any(Date) }),
      );
    });

    it('should throw NotFoundException when dose not found', async () => {
      repository.findDoseById.mockResolvedValue(null);

      await expect(
        service.updateDoseStatus('clinic-1', 'patient-1', 'dose-x', {
          status: 'TAKEN',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAdherenceSummary', () => {
    it('should calculate adherence rate correctly', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.groupDosesByStatus.mockResolvedValue([
        { status: 'TAKEN', _count: { status: 8 } },
        { status: 'MISSED', _count: { status: 2 } },
      ]);

      const result = await service.getAdherenceSummary('clinic-1', 'patient-1');

      expect(result.taken).toBe(8);
      expect(result.missed).toBe(2);
      expect(result.totalDoses).toBe(10);
      expect(result.adherenceRate).toBe(80);
    });

    it('should return 0 adherence rate when no doses', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.groupDosesByStatus.mockResolvedValue([]);

      const result = await service.getAdherenceSummary('clinic-1', 'patient-1');

      expect(result.totalDoses).toBe(0);
      expect(result.adherenceRate).toBe(0);
    });

    it('should include ADMINISTERED doses in taken count', async () => {
      repository.verifyPatientAccess.mockResolvedValue(true);
      repository.groupDosesByStatus.mockResolvedValue([
        { status: 'TAKEN', _count: { status: 5 } },
        { status: 'ADMINISTERED', _count: { status: 3 } },
        { status: 'MISSED', _count: { status: 2 } },
      ]);

      const result = await service.getAdherenceSummary('clinic-1', 'patient-1');

      expect(result.taken).toBe(8);
      expect(result.totalDoses).toBe(10);
      expect(result.adherenceRate).toBe(80);
    });
  });

  describe('generateScheduledDoses', () => {
    it('should generate doses for BID medication over 7 days', async () => {
      const prescription = {
        id: 'rx-1',
        date: new Date('2026-03-21'),
        medications: [
          {
            id: 'med-1',
            isPRN: false,
            sigCode: 'BID',
            frequency: 'Twice daily',
            duration: '7 days',
            startDate: new Date('2026-03-21'),
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);
      repository.createManyDoses.mockResolvedValue({ count: 14 });

      const result = await service.generateScheduledDoses(
        'clinic-1',
        'patient-1',
        'rx-1',
      );

      const call = (
        repository.createManyDoses as jest.Mock<
          (...args: unknown[]) => Promise<unknown>
        >
      ).mock.calls[0]?.[0] as unknown[] | undefined;
      expect(call).toHaveLength(14);
      expect(result.medicationsProcessed).toBe(1);
    });

    it('should skip PRN medications', async () => {
      const prescription = {
        id: 'rx-2',
        date: new Date('2026-03-21'),
        medications: [
          {
            id: 'med-2',
            isPRN: true,
            sigCode: 'QD',
            frequency: 'Once daily',
            duration: '7 days',
            startDate: null,
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);

      const result = await service.generateScheduledDoses(
        'clinic-1',
        'patient-1',
        'rx-2',
      );

      expect(repository.createManyDoses).not.toHaveBeenCalled();
      expect(result.medicationsProcessed).toBe(0);
    });

    it('should throw NotFoundException when prescription not found', async () => {
      repository.findPrescriptionById.mockResolvedValue(null);

      await expect(
        service.generateScheduledDoses('clinic-1', 'patient-1', 'rx-missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip if dose count exceeds 500', async () => {
      const prescription = {
        id: 'rx-3',
        date: new Date('2026-03-01'),
        medications: [
          {
            id: 'med-3',
            isPRN: false,
            sigCode: 'QID',
            frequency: '4 times daily',
            duration: '6 months',
            startDate: null,
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);

      const result = await service.generateScheduledDoses(
        'clinic-1',
        'patient-1',
        'rx-3',
      );

      expect(repository.createManyDoses).not.toHaveBeenCalled();
      expect(result.medicationsProcessed).toBe(0);
    });
  });

  describe('SigCode and frequency parsing', () => {
    it('should generate 1 dose/day for QD', async () => {
      const prescription = {
        id: 'rx-qd',
        date: new Date('2026-03-21'),
        medications: [
          {
            id: 'med-qd',
            isPRN: false,
            sigCode: 'QD',
            frequency: 'Once daily',
            duration: '5 days',
            startDate: new Date('2026-03-21'),
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);
      repository.createManyDoses.mockResolvedValue({ count: 5 });

      await service.generateScheduledDoses('clinic-1', 'patient-1', 'rx-qd');

      const call = (
        repository.createManyDoses as jest.Mock<
          (...args: unknown[]) => Promise<unknown>
        >
      ).mock.calls[0]?.[0] as unknown[] | undefined;
      expect(call).toHaveLength(5);
    });

    it('should parse free-text "twice" when no sigCode', async () => {
      const prescription = {
        id: 'rx-ft',
        date: new Date('2026-03-21'),
        medications: [
          {
            id: 'med-ft',
            isPRN: false,
            sigCode: null,
            frequency: 'twice',
            duration: '3 days',
            startDate: new Date('2026-03-21'),
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);
      repository.createManyDoses.mockResolvedValue({ count: 6 });

      await service.generateScheduledDoses('clinic-1', 'patient-1', 'rx-ft');

      const call = (
        repository.createManyDoses as jest.Mock<
          (...args: unknown[]) => Promise<unknown>
        >
      ).mock.calls[0]?.[0] as unknown[] | undefined;
      expect(call).toHaveLength(6);
    });

    it('should skip medication with unparseable frequency', async () => {
      const prescription = {
        id: 'rx-unknown',
        date: new Date('2026-03-21'),
        medications: [
          {
            id: 'med-unknown',
            isPRN: false,
            sigCode: null,
            frequency: 'as directed',
            duration: '7 days',
            startDate: null,
          },
        ],
      };
      repository.findPrescriptionById.mockResolvedValue(prescription);

      await service.generateScheduledDoses(
        'clinic-1',
        'patient-1',
        'rx-unknown',
      );

      expect(repository.createManyDoses).not.toHaveBeenCalled();
    });
  });
});
