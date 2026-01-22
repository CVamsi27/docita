import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MedicationValidationService } from './medication-validation.service';
import { AuthGuard } from '@nestjs/passport';
import {
  CheckDrugInteractionsDto,
  ValidateDosageDto,
  CheckContraindicationsDto,
  ValidatePediatricDosageDto,
  ValidateRenalDosageDto,
  ComprehensiveMedicationCheckDto,
} from './dto/medications.dto';
import { Allergy, RenalFunction } from '@workspace/types';

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
  checkInteractions(@Body() body: CheckDrugInteractionsDto) {
    return this.medicationService.checkDrugInteractions(
      body.medications,
      body.patientAllergies || [],
    );
  }

  /**
   * Validate medication dosage
   */
  @Post('validate-dosage')
  validateDosage(@Body() body: ValidateDosageDto) {
    return this.medicationService.validateMedicationDosage(
      body.medication,
      body.dosage,
    );
  }

  /**
   * Check contraindications for a patient
   */
  @Post('check-contraindications')
  checkContraindications(@Body() body: CheckContraindicationsDto) {
    return this.medicationService.checkContraindications(body.medication, {
      allergies: body.patientAllergies as unknown as Allergy[],
      conditions: body.patientConditions,
      currentMedications: body.currentMedications,
      isPregnant: body.isPregnant,
      renalFunctionCategory:
        body.renalFunctionCategory as unknown as RenalFunction,
    });
  }

  /**
   * Validate pediatric dosage
   */
  @Post('validate-pediatric-dosage')
  validatePediatricDosage(@Body() body: ValidatePediatricDosageDto) {
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
  validateRenalDosage(@Body() body: ValidateRenalDosageDto) {
    return this.medicationService.validateRenalDosageImpl(
      body.medication,
      body.dosage,
      body.renalFunctionCategory as unknown as RenalFunction,
    );
  }

  /**
   * Comprehensive medication safety check
   */
  @Post('comprehensive-check')
  comprehensiveCheck(@Body() body: ComprehensiveMedicationCheckDto) {
    return this.medicationService.comprehensiveMedicationCheck(body);
  }
}
