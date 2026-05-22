#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const enforce = process.argv.includes('--enforce');

const REMOVED_PATH_FRAGMENTS = [
  'document-generation/builders/',
  'document-generation/renderers/',
  'document-generation.service',
  'document-generation.module',
];

const files = execSync('git ls-files apps/api', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => /\.tsx?$/.test(file));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  for (const fragment of REMOVED_PATH_FRAGMENTS) {
    if (source.includes(fragment)) {
      findings.push(
        `${file}: references removed PDF pipeline \`${fragment}\``,
      );
    }
  }
}

const rendererInterface =
  'apps/api/src/shared/modules/document-generation/pdf/pdf-document-renderer.interface.ts';
const clinicalInvoicePdf =
  'apps/api/src/shared/modules/document-generation/pdf/clinical-invoice-pdf.service.ts';
if (!existsSync(rendererInterface)) {
  findings.push('Missing IPdfDocumentRenderer contract file.');
}
if (!existsSync(clinicalInvoicePdf)) {
  findings.push('Missing shared ClinicalInvoicePdfService (GST invoice path).');
}

if (findings.length > 0) {
  console.error(
    enforce
      ? 'PDF pipeline check failed.\n'
      : 'PDF pipeline report:\n',
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log('PDF pipeline check passed.');
