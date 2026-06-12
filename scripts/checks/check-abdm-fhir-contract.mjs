#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  schema: path.join(root, "packages/db/prisma/schema.prisma"),
  service: path.join(
    root,
    "apps/api/src/domains/abdm/application/services/abdm-exchange.service.ts",
  ),
  controller: path.join(
    root,
    "apps/api/src/domains/abdm/presentation/controllers/abdm.controller.ts",
  ),
  contracts: path.join(root, "packages/types/src/clinical/abdm.ts"),
  dataAccess: path.join(root, "packages/data-access/src/hooks/use-abdm.ts"),
};

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required ABDM contract file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`ABDM contract check failed: ${label}`);
  }
}

const schema = readRequired(files.schema);
const service = readRequired(files.service);
const controller = readRequired(files.controller);
const contracts = readRequired(files.contracts);
const dataAccess = readRequired(files.dataAccess);

for (const model of [
  "model AbdmCareContext",
  "model AbdmTransaction",
  "model AbdmConsentRequest",
  "model AbdmExternalRecord",
]) {
  assertIncludes(schema, model, `${model} must exist in Prisma schema`);
}

assertIncludes(
  service,
  "this.fhirService.getPatientBundle",
  "M2 care-context generation must use the shared FHIR service",
);
assertIncludes(
  controller,
  "this.webhookVerifier.verify",
  "ABDM callbacks must use replay-protected webhook verification",
);
assertIncludes(
  controller,
  "provider: 'abdm'",
  "ABDM callback verification must use the abdm provider key",
);
assertIncludes(
  contracts,
  "abdmGatewayCallbackSchema",
  "ABDM callback payload schema must be shared in packages/types",
);
assertIncludes(
  dataAccess,
  "useAbdmOpsInbox",
  "frontend must consume ABDM ops state through shared data-access hooks",
);

console.log("ABDM FHIR contract check passed");
