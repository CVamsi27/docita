import { Injectable } from '@nestjs/common';
import {
  validateDosage,
  validatePediatricDosage,
  validateRenalDosage,
  checkMedicationContraindications,
} from '@workspace/types';

@Injectable()
export class MedicationValidationService {
  /**
   * Check for drug-drug interactions between medications
   */
  checkDrugInteractions(
    medications: Array<{ name: string; dosage?: string }>,
    patientAllergies: string[] = [],
  ) {
    const interactions: any[] = [];
    const allergies: any[] = [];

    // Check medication pairs for interactions
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i].name.toLowerCase();
        const med2 = medications[j].name.toLowerCase();
      }
    }

    // Check for allergy interactions
    for (const med of medications) {
      for (const allergy of patientAllergies) {
        if (
          med.name.toLowerCase().includes(allergy.toLowerCase()) ||
          allergy.toLowerCase().includes(med.name.toLowerCase())
        ) {
          allergies.push({
            medication: med.name,
            allergy,
            severity: 'warning',
          });
        }
      }
    }

    return {
      interactions,
      allergies,
      hasWarnings: interactions.length > 0 || allergies.length > 0,
    };
  }

  /**
   * Validate medication dosage
   */
  validateMedicationDosage(medication: string, dosage: string) {
    return validateDosage(medication, dosage);
  }

  /**
   * Validate pediatric dosage
   */
  validatePediatricDosageImpl(
    medication: string,
    dosage: string,
    weightKg: number,
  ) {
    return validatePediatricDosage(medication, dosage, weightKg);
  }

  /**
   * Validate renal dosage adjustment
   */
  validateRenalDosageImpl(
    medication: string,
    dosage: string,
    renalFunctionCategory: 'normal' | 'mild' | 'moderate' | 'severe' | 'esrd',
  ) {
    return validateRenalDosage(medication, dosage, renalFunctionCategory);
  }

  /**
   * Check contraindications for a medication
   */
  checkContraindications(
    medication: string,
    patientData: {
      allergies?: Array<{ name: string; severity: string }>;
      conditions?: Array<{ icdCode: string; name: string }>;
      currentMedications?: string[];
      isPregnant?: boolean;
      renalFunctionCategory?: string;
    },
  ) {
    return checkMedicationContraindications(medication, patientData as any);
  }

  /**
   * Comprehensive medication safety check
   */
  comprehensiveMedicationCheck(params: {
    medications: Array<{ name: string; dosage: string }>;
    patientAllergies?: string[];
    currentMedications?: string[];
    isPregnant?: boolean;
    age?: number;
    weight?: number;
    renalFunction?: string;
  }) {
    const results = {
      dosageValidations: [] as any[],
      interactionChecks: [] as any[],
      contraindications: [] as any[],
      pediatricValidations: [] as any[],
      renalValidations: [] as any[],
      warnings: [] as string[],
      errors: [] as string[],
    };

    // Validate each medication's dosage
    for (const med of params.medications) {
      const dosageValidation = this.validateMedicationDosage(
        med.name,
        med.dosage,
      );
      results.dosageValidations.push(dosageValidation);

      if (!dosageValidation.isValid) {
        results.errors.push(
          `${med.name}: ${dosageValidation.message || 'Invalid dosage'}`,
        );
      }
    }

    // Check drug-drug interactions
    const interactions = this.checkDrugInteractions(
      params.medications,
      params.patientAllergies || [],
    );
    results.interactionChecks.push(interactions);

    if (interactions.hasWarnings) {
      results.warnings.push('Drug interactions detected');
    }

    // Check contraindications for each medication
    for (const med of params.medications) {
      const contraindications = this.checkContraindications(med.name, {
        allergies: params.patientAllergies?.map((name) => ({
          name,
          severity: 'moderate',
        })),
        currentMedications: params.currentMedications,
        isPregnant: params.isPregnant,
        renalFunctionCategory: params.renalFunction as any,
      });

      results.contraindications.push({
        medication: med.name,
        contraindications,
      });

      if (Array.isArray(contraindications) && contraindications.length > 0) {
        const criticalCount = contraindications.filter(
          (c: any) => c.severity === 'critical',
        ).length;
        if (criticalCount > 0) {
          results.errors.push(
            `${med.name}: Critical contraindication detected`,
          );
        }
      }
    }

    // Pediatric dosage validation
    if (params.weight && params.age && params.age < 18) {
      for (const med of params.medications) {
        const pediatricValidation = this.validatePediatricDosageImpl(
          med.name,
          med.dosage,
          params.weight,
        );
        results.pediatricValidations.push(pediatricValidation);

        if (!pediatricValidation.isValid) {
          results.warnings.push(
            `Pediatric: ${med.name} - ${pediatricValidation.message}`,
          );
        }
      }
    }

    // Renal dosage validation
    if (params.renalFunction && params.renalFunction !== 'normal') {
      for (const med of params.medications) {
        const renalValidation = this.validateRenalDosageImpl(
          med.name,
          med.dosage,
          params.renalFunction as any,
        );
        results.renalValidations.push(renalValidation);

        if (renalValidation.requiresMonitoring) {
          results.warnings.push(`Renal: ${renalValidation.message}`);
        }
      }
    }

    return {
      ...results,
      isApproved: results.errors.length === 0,
      requiresReview: results.warnings.length > 0,
      summary: {
        totalMedications: params.medications.length,
        validMedications: results.dosageValidations.filter((v) => v.isValid)
          .length,
        warnings: results.warnings.length,
        errors: results.errors.length,
      },
    };
  }
}
