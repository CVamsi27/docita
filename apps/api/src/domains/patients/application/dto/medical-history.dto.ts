import { createZodDto } from 'nestjs-zod';
import {
  createMedicalConditionSchema,
  updateMedicalConditionSchema,
  createPatientAllergySchema,
  updatePatientAllergySchema,
  createPatientFamilyHistorySchema,
  updatePatientFamilyHistorySchema,
  createPatientSocialHistorySchema,
  createPatientSurgicalHistorySchema,
  updatePatientSurgicalHistorySchema,
} from '@workspace/types';

export class CreateMedicalConditionDto extends createZodDto(
  createMedicalConditionSchema,
) {}

export class UpdateMedicalConditionDto extends createZodDto(
  updateMedicalConditionSchema,
) {}

export class CreateAllergyDto extends createZodDto(
  createPatientAllergySchema,
) {}

export class UpdateAllergyDto extends createZodDto(
  updatePatientAllergySchema,
) {}

export class CreateFamilyHistoryDto extends createZodDto(
  createPatientFamilyHistorySchema,
) {}

export class UpdateFamilyHistoryDto extends createZodDto(
  updatePatientFamilyHistorySchema,
) {}

export class CreateSocialHistoryDto extends createZodDto(
  createPatientSocialHistorySchema,
) {}

export class CreateSurgicalHistoryDto extends createZodDto(
  createPatientSurgicalHistorySchema,
) {}

export class UpdateSurgicalHistoryDto extends createZodDto(
  updatePatientSurgicalHistorySchema,
) {}
