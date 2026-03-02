import { PrismaClient } from '@workspace/db';
import { ICD_10_CODES_INFECTIOUS_NEOPLASMS } from './seed-icd-codes-infectious-neoplasms';
import { ICD_10_CODES_ENDOCRINE_MENTAL_NERVOUS } from './seed-icd-codes-endocrine-mental-nervous';
import { ICD_10_CODES_EYE_EAR_CIRCULATORY } from './seed-icd-codes-eye-ear-circulatory';
import { ICD_10_CODES_RESPIRATORY_DIGESTIVE } from './seed-icd-codes-respiratory-digestive';
import { ICD_10_CODES_SKIN_MUSCULOSKELETAL } from './seed-icd-codes-skin-musculoskeletal';
import { ICD_10_CODES_GENITOURINARY_PREGNANCY_SYMPTOMS } from './seed-icd-codes-genitourinary-pregnancy-symptoms';
import { ICD_10_CODES_INJURY_FACTORS } from './seed-icd-codes-injury-factors';

interface SeedIcdCodeInput {
  code: string;
  description: string;
  category: string;
}

const ICD_10_CODES: SeedIcdCodeInput[] = [
  ...ICD_10_CODES_INFECTIOUS_NEOPLASMS,
  ...ICD_10_CODES_ENDOCRINE_MENTAL_NERVOUS,
  ...ICD_10_CODES_EYE_EAR_CIRCULATORY,
  ...ICD_10_CODES_RESPIRATORY_DIGESTIVE,
  ...ICD_10_CODES_SKIN_MUSCULOSKELETAL,
  ...ICD_10_CODES_GENITOURINARY_PREGNANCY_SYMPTOMS,
  ...ICD_10_CODES_INJURY_FACTORS,
];

export async function seedIcdCodes(prisma: PrismaClient): Promise<number> {
  for (const icd of ICD_10_CODES) {
    await prisma.icdCode.upsert({
      where: { code: icd.code },
      update: { description: icd.description, category: icd.category },
      create: { ...icd, version: 'ICD-10' },
    });
  }

  return ICD_10_CODES.length;
}
