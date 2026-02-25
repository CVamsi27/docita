import { Injectable } from '@nestjs/common';
import {
  patientMedicalConditionSchema,
  patientAllergySchema,
  patientFamilyHistorySchema,
  patientSocialHistorySchema,
  patientSurgicalHistorySchema,
  PatientMedicalCondition,
  PatientAllergy,
  PatientFamilyHistory,
  PatientSocialHistory,
  PatientSurgicalHistory,
} from '@workspace/types';

@Injectable()
export class MedicalHistoryFactory {
  createCondition(data: Record<string, unknown>): PatientMedicalCondition {
    return patientMedicalConditionSchema.parse(data);
  }

  createAllergy(data: Record<string, unknown>): PatientAllergy {
    return patientAllergySchema.parse(data);
  }

  createFamilyHistory(data: Record<string, unknown>): PatientFamilyHistory {
    return patientFamilyHistorySchema.parse(data);
  }

  createSocialHistory(data: Record<string, unknown>): PatientSocialHistory {
    return patientSocialHistorySchema.parse(data);
  }

  createSurgicalHistory(data: Record<string, unknown>): PatientSurgicalHistory {
    return patientSurgicalHistorySchema.parse(data);
  }
}
