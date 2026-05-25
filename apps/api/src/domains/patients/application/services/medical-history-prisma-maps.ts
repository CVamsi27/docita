import {
  AllergySeverity as PrismaAllergySeverity,
  AllergyType as PrismaAllergyType,
  ConditionSeverity as PrismaConditionSeverity,
  ConditionStatus as PrismaConditionStatus,
  MedicalConditionType as PrismaMedicalConditionType,
} from '@workspace/db';
import type {
  AllergySeverity,
  AllergyType,
  ConditionSeverity,
  ConditionStatus,
  MedicalConditionType,
} from '@workspace/types';

export const DOMAIN_TO_PRISMA_MEDICAL_CONDITION_TYPE: Record<
  MedicalConditionType,
  PrismaMedicalConditionType
> = {
  CHRONIC: PrismaMedicalConditionType.CHRONIC,
  ACUTE: PrismaMedicalConditionType.ACUTE,
  CONGENITAL: PrismaMedicalConditionType.CONGENITAL,
  INFECTIOUS: PrismaMedicalConditionType.INFECTIOUS,
  AUTOIMMUNE: PrismaMedicalConditionType.AUTOIMMUNE,
  PSYCHIATRIC: PrismaMedicalConditionType.PSYCHIATRIC,
  OTHER: PrismaMedicalConditionType.OTHER,
};

export const DOMAIN_TO_PRISMA_CONDITION_STATUS: Record<
  ConditionStatus,
  PrismaConditionStatus
> = {
  ACTIVE: PrismaConditionStatus.ACTIVE,
  MANAGED: PrismaConditionStatus.MANAGED,
  RESOLVED: PrismaConditionStatus.RESOLVED,
  IN_REMISSION: PrismaConditionStatus.IN_REMISSION,
};

export const DOMAIN_TO_PRISMA_CONDITION_SEVERITY: Record<
  ConditionSeverity,
  PrismaConditionSeverity
> = {
  MILD: PrismaConditionSeverity.MILD,
  MODERATE: PrismaConditionSeverity.MODERATE,
  SEVERE: PrismaConditionSeverity.SEVERE,
  CRITICAL: PrismaConditionSeverity.CRITICAL,
};

export const DOMAIN_TO_PRISMA_ALLERGY_TYPE: Record<
  AllergyType,
  PrismaAllergyType
> = {
  DRUG: PrismaAllergyType.DRUG,
  FOOD: PrismaAllergyType.FOOD,
  ENVIRONMENTAL: PrismaAllergyType.ENVIRONMENTAL,
  LATEX: PrismaAllergyType.LATEX,
  INSECT: PrismaAllergyType.INSECT,
  CONTRAST: PrismaAllergyType.CONTRAST,
  OTHER: PrismaAllergyType.OTHER,
};

export const DOMAIN_TO_PRISMA_ALLERGY_SEVERITY: Record<
  AllergySeverity,
  PrismaAllergySeverity
> = {
  MILD: PrismaAllergySeverity.MILD,
  MODERATE: PrismaAllergySeverity.MODERATE,
  SEVERE: PrismaAllergySeverity.SEVERE,
  LIFE_THREATENING: PrismaAllergySeverity.LIFE_THREATENING,
};
