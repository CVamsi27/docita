import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionValidationRulesService } from '../domain-services/prescription-validation-rules.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe.skip('PrescriptionValidationRulesService', () => {
  let service: PrescriptionValidationRulesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    medication: {
      findUnique: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionValidationRulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PrescriptionValidationRulesService>(
      PrescriptionValidationRulesService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('validateDosage', () => {
    it('should accept valid adult dosage', () => {
      const result = service.validateDosage('aspirin', 500, 'mg', 30);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should accept pediatric dosage adjustment', () => {
      const result = service.validateDosage('metformin', 250, 'mg', 10); // Pediatric dose

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('pediatric');
    });

    it('should reject dosage exceeding maximum', () => {
      const result = service.validateDosage('aspirin', 5000, 'mg', 30); // Way over max

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dosage exceeds maximum allowed');
    });

    it('should reject dosage below minimum', () => {
      const result = service.validateDosage('aspirin', 10, 'mg', 30); // Below min 100mg

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dosage below minimum allowed');
    });

    it('should reject invalid medication', () => {
      const result = service.validateDosage('unknown-drug', 500, 'mg', 30);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Medication not found');
    });
  });

  describe('validateDrugInteraction', () => {
    it('should accept non-interacting medications', () => {
      const result = service.validateDrugInteraction(['aspirin', 'ibuprofen']);

      expect(result.valid).toBe(true);
      expect(result.interactions.length).toBe(0);
    });

    it('should detect warfarin and NSAID interaction', () => {
      const result = service.validateDrugInteraction(['warfarin', 'ibuprofen']);

      expect(result.valid).toBe(false);
      expect(result.interactions.length).toBeGreaterThan(0);
      expect(result.interactions[0]).toContain('bleeding risk');
    });

    it('should detect metformin and contrast dye interaction', () => {
      const result = service.validateDrugInteraction([
        'metformin',
        'contrast-dye',
      ]);

      expect(result.valid).toBe(false);
      expect(result.interactions).toContain(
        'Metformin + Contrast dye: Risk of lactic acidosis',
      );
    });

    it('should detect lisinopril and NSAID interaction', () => {
      const result = service.validateDrugInteraction([
        'lisinopril',
        'naproxen',
      ]);

      expect(result.valid).toBe(false);
    });

    it('should return empty array for single medication', () => {
      const result = service.validateDrugInteraction(['aspirin']);

      expect(result.valid).toBe(true);
      expect(result.interactions.length).toBe(0);
    });
  });

  describe('validatePatientContraindications', () => {
    it('should accept medications for patient without contraindications', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        medicalHistory: ['hypertension'],
      });

      const result = await service.validatePatientContraindications(
        'patient-1',
        ['aspirin', 'lisinopril'],
      );

      expect(result.valid).toBe(true);
    });

    it('should reject metformin for patient with renal impairment', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        medicalHistory: ['renal impairment'],
      });

      const result = await service.validatePatientContraindications(
        'patient-1',
        ['metformin'],
      );

      expect(result.valid).toBe(false);
      expect(result.contraindications).toContain(
        'Metformin contraindicated in renal impairment',
      );
    });

    it('should reject lisinopril for pregnant patients', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-2',
        medicalHistory: ['pregnancy'],
      });

      const result = await service.validatePatientContraindications(
        'patient-2',
        ['lisinopril'],
      );

      expect(result.valid).toBe(false);
    });

    it('should reject NSAIDs for patient with peptic ulcer', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-3',
        medicalHistory: ['peptic ulcer'],
      });

      const result = await service.validatePatientContraindications(
        'patient-3',
        ['ibuprofen', 'naproxen'],
      );

      expect(result.valid).toBe(false);
      expect(result.contraindications.length).toBeGreaterThan(0);
    });
  });

  describe('validatePrescriptionDuration', () => {
    it('should accept valid prescription duration', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-15');

      const result = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'lisinopril',
      );

      expect(result.valid).toBe(true);
    });

    it('should reject prescription duration longer than 12 months', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2025-03-01'); // 13 months

      const result = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'lisinopril',
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cannot exceed 12 months');
    });

    it('should reject antibiotic prescription longer than 28 days', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-03-01'); // 30 days

      const result = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'amoxicillin',
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('antibiotics cannot exceed 28 days');
    });

    it('should accept antibiotic prescription within 28 days', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28'); // 27 days

      const result = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'amoxicillin',
      );

      expect(result.valid).toBe(true);
    });

    it('should reject end date before start date', () => {
      const startDate = new Date('2024-02-15');
      const endDate = new Date('2024-02-01');

      const result = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'lisinopril',
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('before start date');
    });
  });

  describe('validateFrequency', () => {
    it('should accept valid frequencies', () => {
      const frequencies = ['OD', 'BD', 'TDS', 'QID', 'SOS'];

      frequencies.forEach((freq) => {
        const result = service.validateFrequency(freq, 'lisinopril');
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid frequency code', () => {
      const result = service.validateFrequency('XXX', 'lisinopril');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid frequency code');
    });

    it('should warn for SOS frequency on maintenance medication', () => {
      const result = service.validateFrequency('SOS', 'lisinopril');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('maintenance medication');
    });
  });

  describe('validateRefills', () => {
    it('should not allow refills for controlled substances', () => {
      const result = service.validateRefills('controlled', 5);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cannot be refilled');
    });

    it('should allow 1 refill for antibiotics', () => {
      const result = service.validateRefills('antibiotic', 1);

      expect(result.valid).toBe(true);
    });

    it('should reject more than 1 refill for antibiotics', () => {
      const result = service.validateRefills('antibiotic', 2);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maximum 1 refill');
    });

    it('should allow up to 11 refills for maintenance medication', () => {
      const result = service.validateRefills('maintenance', 11);

      expect(result.valid).toBe(true);
    });

    it('should reject more than 11 refills for maintenance medication', () => {
      const result = service.validateRefills('maintenance', 12);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maximum 11 refills');
    });
  });

  describe('validateAllergies', () => {
    it('should accept medications patient is not allergic to', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        allergies: ['penicillin'],
      });

      const result = await service.validateAllergies('patient-1', [
        'aspirin',
        'ibuprofen',
      ]);

      expect(result.valid).toBe(true);
    });

    it('should reject medication patient is allergic to', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        allergies: ['penicillin', 'sulfa'],
      });

      const result = await service.validateAllergies(
        'patient-1',
        ['amoxicillin'], // Contains penicillin
      );

      expect(result.valid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toContain('allergy');
    });

    it('should check multiple medications against allergies', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        allergies: ['penicillin'],
      });

      const result = await service.validateAllergies('patient-1', [
        'amoxicillin',
        'aspirin',
      ]);

      expect(result.conflicts.length).toBe(1); // Only amoxicillin conflicts
    });
  });

  describe('calculateNextRefillDate', () => {
    it('should calculate next refill date correctly', () => {
      const prescriptionDate = new Date('2024-02-01');
      const frequency = 'OD'; // Once daily
      const quantity = 30;

      const nextRefillDate = service.calculateNextRefillDate(
        prescriptionDate,
        frequency,
        quantity,
      );

      expect(nextRefillDate).toBeInstanceOf(Date);
      expect(nextRefillDate.getTime()).toBeGreaterThan(
        prescriptionDate.getTime(),
      );
    });

    it('should refill at 80% through supply', () => {
      const prescriptionDate = new Date('2024-02-01');
      const frequency = 'BD'; // Twice daily
      const quantity = 30;

      const nextRefillDate = service.calculateNextRefillDate(
        prescriptionDate,
        frequency,
        quantity,
      );

      // 30 tablets at BD = 15 days supply, 80% = 12 days
      const expectedRefillDate = new Date(prescriptionDate);
      expectedRefillDate.setDate(expectedRefillDate.getDate() + 12);

      expect(
        Math.abs(nextRefillDate.getTime() - expectedRefillDate.getTime()),
      ).toBeLessThan(24 * 60 * 60 * 1000); // Within 1 day
    });

    it('should handle different frequencies', () => {
      const prescriptionDate = new Date('2024-02-01');
      const quantity = 30;

      const refillOD = service.calculateNextRefillDate(
        prescriptionDate,
        'OD',
        quantity,
      );
      const refillBD = service.calculateNextRefillDate(
        prescriptionDate,
        'BD',
        quantity,
      );

      expect(refillOD.getTime()).toBeGreaterThan(refillBD.getTime()); // OD supply lasts longer
    });

    it('should handle SOS frequency conservatively', () => {
      const prescriptionDate = new Date('2024-02-01');
      const quantity = 10;

      const refillDate = service.calculateNextRefillDate(
        prescriptionDate,
        'SOS',
        quantity,
      );

      // SOS medications refill sooner (60% instead of 80%)
      const expectedRefillDate = new Date(prescriptionDate);
      expectedRefillDate.setDate(expectedRefillDate.getDate() + 15); // Conservative estimate for 10 tablets

      expect(
        Math.abs(refillDate.getTime() - expectedRefillDate.getTime()),
      ).toBeLessThan(24 * 60 * 60 * 1000 * 5); // Within 5 days
    });
  });

  describe('integration scenarios', () => {
    it('should validate complete prescription workflow', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        medicalHistory: ['hypertension'],
        allergies: [],
      });

      // Step 1: Check dosage
      const dosageCheck = service.validateDosage('lisinopril', 10, 'mg', 45);
      expect(dosageCheck.valid).toBe(true);

      // Step 2: Check interactions
      const interactionCheck = service.validateDrugInteraction(['lisinopril']);
      expect(interactionCheck.valid).toBe(true);

      // Step 3: Check contraindications
      const contraIndicationCheck =
        await service.validatePatientContraindications('patient-1', [
          'lisinopril',
        ]);
      expect(contraIndicationCheck.valid).toBe(true);

      // Step 4: Check duration
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-03-01');
      const durationCheck = service.validatePrescriptionDuration(
        startDate,
        endDate,
        'lisinopril',
      );
      expect(durationCheck.valid).toBe(true);

      // Step 5: Check frequency
      const frequencyCheck = service.validateFrequency('OD', 'lisinopril');
      expect(frequencyCheck.valid).toBe(true);

      // Step 6: Check refills
      const refillCheck = service.validateRefills('maintenance', 11);
      expect(refillCheck.valid).toBe(true);

      // Step 7: Check allergies
      const allergyCheck = await service.validateAllergies('patient-1', [
        'lisinopril',
      ]);
      expect(allergyCheck.valid).toBe(true);
    });

    it('should reject prescription with multiple violations', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({
        id: 'patient-1',
        medicalHistory: ['pregnancy'],
        allergies: ['NSAIDs'],
      });

      // Lisinopril contraindicated in pregnancy
      const contraIndicationCheck =
        await service.validatePatientContraindications('patient-1', [
          'lisinopril',
        ]);
      expect(contraIndicationCheck.valid).toBe(false);

      // NSAIDs contraindicated in pregnancy and patient allergic
      const allergyCheck = await service.validateAllergies('patient-1', [
        'ibuprofen',
      ]);
      expect(allergyCheck.valid).toBe(false);
    });
  });
});
