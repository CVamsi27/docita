import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MedicationValidationService } from './medication-validation.service';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('medications')
@UseGuards(AuthGuard('jwt'))
export class MedicationValidationController {
  constructor(private medicationService: MedicationValidationService) {}

  /**
   * Check for drug-drug interactions
   */
  @Post('check-interactions')
  async checkInteractions(
    @Body()
    body: {
      medications: Array<{ name: string; dosage?: string }>;
      patientAllergies?: string[];
    },
  ) {
    return this.medicationService.checkDrugInteractions(
      body.medications,
      body.patientAllergies || [],
    );
  }

  /**
   * Validate medication dosage
   */
  @Post('validate-dosage')
  async validateDosage(@Body() body: { medication: string; dosage: string }) {
    return this.medicationService.validateMedicationDosage(
      body.medication,
      body.dosage,
    );
  }

  /**
   * Check contraindications for a patient
   */
  @Post('check-contraindications')
  async checkContraindications(
    @Body()
    body: {
      medication: string;
      patientAllergies?: Array<{ name: string; severity: string }>;
      patientConditions?: Array<{ icdCode: string; name: string }>;
      currentMedications?: string[];
      isPregnant?: boolean;
      renalFunctionCategory?: string;
    },
  ) {
    return this.medicationService.checkContraindications(body.medication, {
      allergies: body.patientAllergies,
      conditions: body.patientConditions,
      currentMedications: body.currentMedications,
      isPregnant: body.isPregnant,
      renalFunctionCategory: body.renalFunctionCategory as any,
    });
  }

  /**
   * Validate pediatric dosage
   */
  @Post('validate-pediatric-dosage')
  validatePediatricDosage(
    @Body() body: { medication: string; dosage: string; weightKg: number },
  ) {
    return this.medicationService.validatePediatricDosageImpl(
      body.medication,
      body.dosage,
      body.weightKg,
    );
  }

  /**
   * Validate renal dosage adjustment
   */
  @Post('validate-renal-dosage')
  validateRenalDosage(
    @Body()
    body: {
      medication: string;
      dosage: string;
      renalFunctionCategory: string;
    },
  ) {
    return this.medicationService.validateRenalDosageImpl(
      body.medication,
      body.dosage,
      body.renalFunctionCategory as any,
    );
  }

  /**
   * Comprehensive medication safety check
   */
  @Post('comprehensive-check')
  comprehensiveCheck(
    @Body()
    body: {
      medications: Array<{ name: string; dosage: string }>;
      patientAllergies?: string[];
      patientConditions?: string[];
      currentMedications?: string[];
      isPregnant?: boolean;
      age?: number;
      weight?: number;
      renalFunction?: string;
    },
  ) {
    return this.medicationService.comprehensiveMedicationCheck(body);
  }
}
