import { Injectable } from '@nestjs/common';
import {
  MedicalConditionInput,
  MedicalConditionSchema,
  AllergyInput,
  AllergySchema,
  FamilyHistoryInput,
  FamilyHistorySchema,
  SocialHistoryInput,
  SocialHistorySchema,
  SurgicalHistoryInput,
  SurgicalHistorySchema,
} from '../schemas/medical-history.schema';

@Injectable()
export class MedicalHistoryFactory {
  createCondition(data: MedicalConditionInput) {
    return MedicalConditionSchema.parse(data);
  }

  createAllergy(data: AllergyInput) {
    return AllergySchema.parse(data);
  }

  createFamilyHistory(data: FamilyHistoryInput) {
    return FamilyHistorySchema.parse(data);
  }

  createSocialHistory(data: SocialHistoryInput) {
    return SocialHistorySchema.parse(data);
  }

  createSurgicalHistory(data: SurgicalHistoryInput) {
    return SurgicalHistorySchema.parse(data);
  }
}
