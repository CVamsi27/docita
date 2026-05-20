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

const source = fs.readFileSync(encryptionServicePath, "utf8");

function extractSensitiveFieldLists() {
  const lists = [...source.matchAll(/const sensitiveFields = \[([\s\S]*?)\] as const/g)];
  return lists.map((match) =>
    [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort(),
  );
}

const [encryptFields, decryptFields] = extractSensitiveFieldLists();

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
  ...new Set(
    [...extensionSource.matchAll(/patient\.(\w+)/g)].map((m) => m[1]),
  ),
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
