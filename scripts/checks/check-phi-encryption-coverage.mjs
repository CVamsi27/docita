#!/usr/bin/env node

/**
 * Ensures encryptPatientData / decryptPatientData field lists stay aligned.
 * Patient PHI columns are maintained in encryption.service.ts (schema has no @phi tags).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");
const encryptionServicePath = path.join(
  repoRoot,
  "apps/api/src/shared/common/encryption.service.ts",
);
const patientFieldBoundaryPath = path.join(
  repoRoot,
  "apps/api/src/shared/common/encryption-patient-fields.boundary.ts",
);

const source = fs.readFileSync(encryptionServicePath, "utf8");
const patientFieldBoundarySource = fs.existsSync(patientFieldBoundaryPath)
  ? fs.readFileSync(patientFieldBoundaryPath, "utf8")
  : "";

function parseFieldList(block) {
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

function extractSensitiveFieldLists() {
  const lists = [
    ...source.matchAll(/const sensitiveFields = \[([\s\S]*?)\] as const/g),
  ];
  if (lists.length >= 2) {
    return lists.map((match) => parseFieldList(match[1]));
  }

  const shared = source.match(
    /SENSITIVE_PATIENT_FIELDS = \[([\s\S]*?)\] as const/,
  );
  if (shared) {
    const fields = parseFieldList(shared[1]);
    return [fields, fields];
  }

  const boundary = patientFieldBoundarySource.match(
    /const fields = \[([\s\S]*?)\] as const/,
  );
  if (
    boundary &&
    /encryptPatientData[\s\S]*mapPatientRecordFields/.test(source) &&
    /decryptPatientData[\s\S]*mapPatientRecordFields/.test(source)
  ) {
    const fields = parseFieldList(boundary[1]);
    return [fields, fields];
  }

  return [];
}

const fieldLists = extractSensitiveFieldLists();
const [encryptFields, decryptFields] = fieldLists;

const findings = [];

if (!encryptFields?.length) {
  findings.push("Could not parse sensitiveFields from encryptPatientData");
}
if (!decryptFields?.length) {
  findings.push("Could not parse sensitiveFields from decryptPatientData");
}

if (
  encryptFields?.length &&
  decryptFields?.length &&
  encryptFields.join(",") !== decryptFields.join(",")
) {
  findings.push(
    `encrypt/decrypt field lists differ: encrypt=[${encryptFields.join(", ")}] decrypt=[${decryptFields.join(", ")}]`,
  );
}

const extensionPath = path.join(
  repoRoot,
  "apps/api/src/shared/common/extensions/encryption.extension.ts",
);
const extensionSource = fs.readFileSync(extensionPath, "utf8");
const extensionFields = [
  ...new Set([...extensionSource.matchAll(/patient\.(\w+)/g)].map((m) => m[1])),
].sort();

if (encryptFields?.length) {
  const missingFromExtension = encryptFields.filter(
    (field) => !extensionFields.includes(field),
  );
  const extraInExtension = extensionFields.filter(
    (field) => !encryptFields.includes(field),
  );
  if (missingFromExtension.length > 0) {
    findings.push(
      `encryption.extension.ts result decryptors missing: ${missingFromExtension.join(", ")}`,
    );
  }
  if (extraInExtension.length > 0) {
    findings.push(
      `encryption.extension.ts has decryptors not in encryptPatientData: ${extraInExtension.join(", ")}`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write(
    enforce
      ? "PHI encryption coverage check failed.\n"
      : "PHI encryption coverage report:\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  if (enforce) process.exit(1);
  process.stderr.write("Use --enforce to fail.\n");
  process.exit(0);
}

process.stdout.write(
  `PHI encryption coverage check passed (${encryptFields.length} patient fields).\n`,
);
