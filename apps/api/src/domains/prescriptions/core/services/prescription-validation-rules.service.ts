import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface PrescriptionValidationRulesInterface {
  validateDosage(
    medicationId: string,
    dosage: number,
    unit: string,
    ageYears?: number,
  ): Promise<{ valid: boolean; error?: string; warning?: string }>;

  validateDrugInteraction(
    medicationIds: string[],
  ): Promise<{ hasConflict: boolean; interactions: string[] }>;

  validatePatientContraindications(
    patientId: string,
    medicationIds: string[],
  ): Promise<{ hasContraindication: boolean; contraindications: string[] }>;

  validatePrescriptionDuration(
    startDate: Date,
    endDate: Date,
    medicationId: string,
  ): { valid: boolean; error?: string };

  validateFrequency(frequency: string): { valid: boolean; error?: string };

  validateRefills(
    medicationType: string,
    refillCount: number,
  ): { valid: boolean; error?: string };

  validateAllergies(
    patientId: string,
    medicationIds: string[],
  ): Promise<{ hasAllergy: boolean; allergies: string[] }>;

  calculateNextRefillDate(
    prescriptionDate: Date,
    frequency: string,
    quantity: number,
  ): Date;
}

interface MedicationDosageLimits {
  min: number;
  max: number;
  unit: string;
  pediatricAdjustment?: boolean;
}

interface DrugInfo {
  id: string;
  name: string;
  category: string;
  dosageLimits: MedicationDosageLimits;
  interactions?: string[];
  contraindications?: string[];
}

@Injectable()
export class PrescriptionValidationRulesService implements PrescriptionValidationRulesInterface {
  private readonly COMMON_DOSAGES: Record<string, MedicationDosageLimits> = {
    aspirin: { min: 325, max: 1000, unit: 'mg' },
    metformin: { min: 500, max: 2000, unit: 'mg', pediatricAdjustment: true },
    lisinopril: { min: 2.5, max: 40, unit: 'mg' },
    atorvastatin: { min: 10, max: 80, unit: 'mg' },
    omeprazole: { min: 20, max: 40, unit: 'mg' },
  };

  private readonly DRUG_INTERACTIONS: Record<string, string[]> = {
    warfarin: ['aspirin', 'ibuprofen', 'naproxen'],
    metformin: ['contrast_dye'],
    lisinopril: ['nsaids', 'potassium_supplements'],
  };

  private readonly CONTRAINDICATIONS: Record<string, string[]> = {
    metformin: ['severe_renal_impairment', 'acute_illness'],
    lisinopril: ['pregnancy', 'angioedema_history'],
    nsaids: ['peptic_ulcer', 'heart_failure'],
  };

  private readonly MAX_REFILLS: Record<string, number> = {
    controlled: 0,
    narcotic: 0,
    antibiotic: 1,
    maintenance: 11,
  };

  constructor(private prisma: PrismaService) {}

  async validateDosage(
    medicationId: string,
    dosage: number,
    unit: string,
    ageYears?: number,
  ): Promise<{ valid: boolean; error?: string; warning?: string }> {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
      select: {
        name: true,
        dosage: true,
        strengthUnit: true,
      },
    });

    if (!medication) {
      return {
        valid: false,
        error: `Medication ${medicationId} not found`,
      };
    }

    if (!dosage || dosage <= 0) {
      return {
        valid: false,
        error: `Invalid dosage: must be a positive number`,
      };
    }

    const maxDose = 1000;
    if (dosage > maxDose) {
      return {
        valid: false,
        error: `Dosage ${dosage}${unit} exceeds maximum recommended dose of ${maxDose}${unit}`,
      };
    }

    if (
      ageYears &&
      ageYears < 12 &&
      medication.name.toLowerCase().includes('adult')
    ) {
      return {
        valid: true,
        warning:
          'This medication is typically for adults. Consider pediatric formulation.',
      };
    }

    return { valid: true };
  }

  async validateDrugInteraction(
    medicationIds: string[],
  ): Promise<{ hasConflict: boolean; interactions: string[] }> {
    const interactions: string[] = [];

    const medications = await this.prisma.medication.findMany({
      where: { id: { in: medicationIds } },
      select: { id: true, name: true },
    });

    const medMap = new Map(medications.map((m) => [m.id, m.name]));

    for (let i = 0; i < medicationIds.length; i++) {
      for (let j = i + 1; j < medicationIds.length; j++) {
        const med1Id = medicationIds[i];
        const med2Id = medicationIds[j];
        const med1Name = medMap.get(med1Id)?.toLowerCase() || '';
        const med2Name = medMap.get(med2Id)?.toLowerCase() || '';

        const interactingDrugs = this.DRUG_INTERACTIONS[med1Name] || [];
        if (
          interactingDrugs.some(
            (drug) => med2Name.includes(drug) || drug.includes(med2Name),
          )
        ) {
          interactions.push(`${med1Name} may interact with ${med2Name}`);
        }
      }
    }

    return {
      hasConflict: interactions.length > 0,
      interactions,
    };
  }

  async validatePatientContraindications(
    patientId: string,
    medicationIds: string[],
  ): Promise<{ hasContraindication: boolean; contraindications: string[] }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medicalConditions: true,
      },
    });

    if (!patient) {
      return {
        hasContraindication: false,
        contraindications: [],
      };
    }

    const medications = await this.prisma.medication.findMany({
      where: { id: { in: medicationIds } },
      select: { name: true },
    });

    const contraindications: string[] = [];
    const patientConditions =
      patient.medicalConditions.map((c) => c.conditionName) || [];

    for (const med of medications) {
      const medContraindications =
        this.CONTRAINDICATIONS[med.name.toLowerCase()] || [];

      for (const condition of patientConditions) {
        if (
          medContraindications.some(
            (c) => condition.includes(c) || c.includes(condition),
          )
        ) {
          contraindications.push(
            `${med.name} is contraindicated for patient's ${condition}`,
          );
        }
      }
    }

    return {
      hasContraindication: contraindications.length > 0,
      contraindications,
    };
  }

  validatePrescriptionDuration(
    startDate: Date,
    endDate: Date,
    medicationId: string,
  ): { valid: boolean; error?: string } {
    if (endDate <= startDate) {
      return {
        valid: false,
        error: 'Prescription end date must be after start date',
      };
    }

    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (durationDays > 365) {
      return {
        valid: false,
        error: 'Prescription duration cannot exceed 12 months',
      };
    }

    if (medicationId.includes('antibiotic') && durationDays > 28) {
      return {
        valid: false,
        error: 'Antibiotic prescriptions typically cannot exceed 28 days',
      };
    }

    return { valid: true };
  }

  validateFrequency(frequency: string): { valid: boolean; error?: string } {
    const validFrequencies = [
      'OD',
      'BD',
      'TDS',
      'QID',
      'SOS',
      'ONCE_DAILY',
      'TWICE_DAILY',
      'THREE_TIMES_DAILY',
      'FOUR_TIMES_DAILY',
      'AS_NEEDED',
    ];

    if (!validFrequencies.includes(frequency.toUpperCase())) {
      return {
        valid: false,
        error: `Invalid frequency: ${frequency}. Valid options: ${validFrequencies.join(', ')}`,
      };
    }

    return { valid: true };
  }

  validateRefills(
    medicationType: string,
    refillCount: number,
  ): { valid: boolean; error?: string } {
    const maxRefills = this.MAX_REFILLS[medicationType.toLowerCase()] ?? 11;

    if (refillCount < 0) {
      return {
        valid: false,
        error: 'Refill count cannot be negative',
      };
    }

    if (refillCount > maxRefills) {
      return {
        valid: false,
        error: `Maximum ${maxRefills} refills allowed for ${medicationType} medications`,
      };
    }

    if (medicationType.toLowerCase() === 'controlled' && refillCount > 0) {
      return {
        valid: false,
        error: 'Controlled substances cannot be refilled',
      };
    }

    return { valid: true };
  }

  async validateAllergies(
    patientId: string,
    medicationIds: string[],
  ): Promise<{ hasAllergy: boolean; allergies: string[] }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { allergies: true },
    });

    if (!patient) {
      return { hasAllergy: false, allergies: [] };
    }

    const medications = await this.prisma.medication.findMany({
      where: { id: { in: medicationIds } },
      select: { name: true },
    });

    const allergies: string[] = [];
    const patientAllergies = this.normalizeAllergyList(patient.allergies);

    for (const med of medications) {
      const medName = med.name.toLowerCase();

      if (
        patientAllergies.some(
          (allergen: string) =>
            medName.includes(allergen.toLowerCase()) ||
            allergen.toLowerCase().includes(medName),
        )
      ) {
        allergies.push(`Patient is allergic to ${med.name}`);
      }
    }

    return {
      hasAllergy: allergies.length > 0,
      allergies,
    };
  }

  private normalizeAllergyList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  calculateNextRefillDate(
    prescriptionDate: Date,
    frequency: string,
    quantity: number,
  ): Date {
    const frequencyDailyDose: Record<string, number> = {
      OD: 1,
      BD: 2,
      TDS: 3,
      QID: 4,
      SOS: 0.5,
      ONCE_DAILY: 1,
      TWICE_DAILY: 2,
      THREE_TIMES_DAILY: 3,
      FOUR_TIMES_DAILY: 4,
      AS_NEEDED: 0.5,
    };

    const dailyDose = frequencyDailyDose[frequency.toUpperCase()] || 1;
    const daysSupply = Math.floor(quantity / dailyDose);

    const refillDate = new Date(prescriptionDate);
    refillDate.setDate(refillDate.getDate() + Math.floor(daysSupply * 0.8));

    return refillDate;
  }
}
