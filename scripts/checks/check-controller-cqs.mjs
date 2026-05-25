#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { loadDocumentedFacadeServiceNames } from "../lib/documented-facade-services.mjs";
import { CONTROLLER_CQS_ALLOWLIST } from "../lib/controller-cqs-allowlist.mjs";

const enforce = process.argv.includes("--enforce");

/** Constructor-injected types that satisfy thin-controller / CQS guidance. */
const ALLOWED_TYPE_SUFFIX =
  /(CommandService|QueryService|FacadeService|OrchestratorService|ProcessorService|UseCase|Calculator|Registry|Policy|Resolver|Port)$/;

const DOCUMENTED_FACADES = loadDocumentedFacadeServiceNames();

/** Cross-cutting services controllers may inject without CQS split. */
const CONTROLLER_CROSS_CUTTING_SERVICES = new Set([
  "AuditService",
  "AppConfigService",
  /** Shared HMAC/signature verification for inbound webhooks (not domain CQS). */
  "WebhookVerifierService",
]);

const INJECT_PATTERN =
  /private\s+readonly\s+\w+\s*:\s*([A-Z][A-Za-z0-9]*Service)\b/g;

const files = execSync(
  'git ls-files "apps/api/src/domains/*/presentation/controllers/*.ts"',
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  let match;
  INJECT_PATTERN.lastIndex = 0;
  while ((match = INJECT_PATTERN.exec(source)) !== null) {
    const typeName = match[1];
    if (ALLOWED_TYPE_SUFFIX.test(typeName)) {
      continue;
    }
    if (DOCUMENTED_FACADES.has(typeName)) {
      continue;
    }
    if (CONTROLLER_CROSS_CUTTING_SERVICES.has(typeName)) {
      continue;
    }
    if (CONTROLLER_CQS_ALLOWLIST.has(typeName)) {
      continue;
    }
    if (typeName.endsWith("Service")) {
      findings.push(
        `${file}: injects fat \`${typeName}\`; prefer *CommandService / *QueryService`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "Controller CQS check failed.\n" : "Controller CQS report:\n",
  );
  for (const finding of findings.slice(0, 40)) {
    console.error(`- ${finding}`);
  }
  if (findings.length > 40) {
    console.error(`- ... ${findings.length - 40} more`);
  }
  if (enforce) {
    process.exit(1);
  }
  console.log(
    `Controller CQS reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Controller CQS check passed.");
