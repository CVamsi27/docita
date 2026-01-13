import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  checkDrugInteractionsSchema,
  validateDosageSchema,
  checkContraindicationsSchema,
  validatePediatricDosageSchema,
  validateRenalDosageSchema,
  comprehensiveMedicationCheckSchema,
  medicationSchema,
} from '@workspace/types';

export class CheckDrugInteractionsDto extends createZodDto(
  checkDrugInteractionsSchema,
) {}
export class ValidateDosageDto extends createZodDto(validateDosageSchema) {}
export class CheckContraindicationsDto extends createZodDto(
  checkContraindicationsSchema,
) {}
export class ValidatePediatricDosageDto extends createZodDto(
  validatePediatricDosageSchema,
) {}
export class ValidateRenalDosageDto extends createZodDto(
  validateRenalDosageSchema,
) {}
export class ComprehensiveMedicationCheckDto extends createZodDto(
  comprehensiveMedicationCheckSchema,
) {}

export class MedicationResponseDto extends createZodDto(medicationSchema) {}
export class MedicationListResponseDto extends createZodDto(
  z.array(medicationSchema),
) {}

// Response schemas for validation checks can be complex, often just returning results
// For strictness we could define them, but for now we focus on Input strictness for these functional endpoints
// and Model output strictness for CRUD.
