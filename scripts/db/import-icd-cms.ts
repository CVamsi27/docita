import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { PrismaClient } from '@workspace/db';

const BATCH_SIZE = 500;

const CATEGORY_MAP: Record<string, string> = {
  A: 'Infectious and Parasitic Diseases',
  B: 'Infectious and Parasitic Diseases',
  C: 'Neoplasms',
  D: 'Neoplasms and Blood Diseases',
  E: 'Endocrine and Metabolic Diseases',
  F: 'Mental and Behavioral Disorders',
  G: 'Nervous System Diseases',
  H: 'Eye and Ear Diseases',
  I: 'Circulatory System Diseases',
  J: 'Respiratory Diseases',
  K: 'Digestive Diseases',
  L: 'Skin Diseases',
  M: 'Musculoskeletal Diseases',
  N: 'Genitourinary Diseases',
  O: 'Pregnancy and Childbirth',
  P: 'Perinatal Conditions',
  Q: 'Congenital Malformations',
  R: 'Symptoms and Signs',
  S: 'Injury and Poisoning',
  T: 'Injury and Poisoning',
  V: 'External Causes',
  W: 'External Causes',
  X: 'External Causes',
  Y: 'External Causes',
  Z: 'Health Factors',
};

function getCategory(code: string): string {
  const firstChar = code.charAt(0).toUpperCase();
  return CATEGORY_MAP[firstChar] ?? 'Other';
}

async function parseCmsFile(filePath: string): Promise<Array<{ code: string; description: string; category: string }>> {
  const codes: Array<{ code: string; description: string; category: string }> = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;

    const code = trimmed.substring(0, spaceIdx).trim();
    const description = trimmed.substring(spaceIdx + 1).trim();

    if (!code || !description) continue;
    if (code.length < 3 || code.length > 7) continue;

    codes.push({ code, description, category: getCategory(code) });
  }

  return codes;
}

async function importCodes(filePath: string): Promise<void> {
  process.stdout.write(`Parsing CMS ICD-10-CM file: ${filePath}\n`);

  const codes = await parseCmsFile(filePath);
  process.stdout.write(`Parsed ${codes.length} codes\n`);

  const prisma = new PrismaClient();

  try {
    let imported = 0;
    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
      const batch = codes.slice(i, i + BATCH_SIZE).map((c) => ({
        ...c,
        version: 'ICD-10',
      }));

      await prisma.icdCode.createMany({ data: batch, skipDuplicates: true });

      await Promise.all(
        batch.map((c) =>
          prisma.icdCode.updateMany({
            where: { code: c.code },
            data: { description: c.description, category: c.category },
          }),
        ),
      );

      imported += batch.length;
      process.stdout.write(`  Imported ${imported}/${codes.length}...\r`);
    }

    process.stdout.write(`\nDone — ${codes.length} ICD-10-CM codes imported.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

const filePath = process.argv[2];
if (!filePath) {
  process.stderr.write(
    'Usage: pnpm ts-node scripts/db/import-icd-cms.ts <path-to-cms-icd10cm-file>\n\n' +
    'Download the official CMS ICD-10-CM tabular data from:\n' +
    'https://www.cms.gov/medicare/coding-billing/icd-10-codes\n',
  );
  process.exit(1);
}

importCodes(path.resolve(filePath)).catch((err: unknown) => {
  process.stderr.write(`Import failed: ${String(err)}\n`);
  process.exit(1);
});
