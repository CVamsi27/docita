import { PrismaClient } from '@workspace/db';
import { ICD_10_CODES_INFECTIOUS_NEOPLASMS } from './seed-icd-codes-infectious-neoplasms';
import { ICD_10_CODES_ENDOCRINE_MENTAL_NERVOUS } from './seed-icd-codes-endocrine-mental-nervous';
import { ICD_10_CODES_EYE_EAR_CIRCULATORY } from './seed-icd-codes-eye-ear-circulatory';
import { ICD_10_CODES_RESPIRATORY_DIGESTIVE } from './seed-icd-codes-respiratory-digestive';
import { ICD_10_CODES_SKIN_MUSCULOSKELETAL } from './seed-icd-codes-skin-musculoskeletal';
import { ICD_10_CODES_GENITOURINARY_PREGNANCY_SYMPTOMS } from './seed-icd-codes-genitourinary-pregnancy-symptoms';
import { ICD_10_CODES_INJURY_FACTORS } from './seed-icd-codes-injury-factors';

// ICD-10-CM codes sourced from WHO International Classification of Diseases.
// For production updates, download the official CMS ICD-10-CM tabular data from:
// https://www.cms.gov/medicare/coding-billing/icd-10-codes
// and run: pnpm ts-node scripts/import-icd-cms.ts <path-to-cms-file>

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

const BATCH_SIZE = 500;

export async function seedIcdCodes(prisma: PrismaClient): Promise<number> {
  let seeded = 0;

  // Batch upsert for performance — avoids N individual round-trips
  for (let i = 0; i < ICD_10_CODES.length; i += BATCH_SIZE) {
    const batch = ICD_10_CODES.slice(i, i + BATCH_SIZE).map((icd) => ({
      ...icd,
      version: 'ICD-10',
    }));

    await prisma.icdCode.createMany({
      data: batch,
      skipDuplicates: true,
    });

    seeded += batch.length;
  }

  return ICD_10_CODES.length;
}
