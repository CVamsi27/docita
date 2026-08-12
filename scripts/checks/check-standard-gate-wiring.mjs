#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const verifyStandard = packageJson.scripts?.["verify:standard"] ?? "";

const requiredChecks = [
  "test:standards-checks",
  "check:api-domain-layout",
  "check:feature-boundaries",
  "check:package-boundaries",
  "check:facility-type-ssot",
  "check:support-contact-ssot",
  "check:repository-di-tokens",
  "check:form-schema-extends",
  "check:client-storage-usage",
  "check:env-vs-globalenv",
  "check:use-case-loc",
  "check:workflow-script-refs",
  "check:jsx-escape-literals",
  "check:api-conformance",
  "check:route-shadowing",
  "check:openai-client-singleton",
];

const violations = requiredChecks
  .filter((script) => !verifyStandard.includes(`pnpm ${script}`))
  .map((script) => `${script} is not wired into verify:standard`);

reportFindingsAndExit("Standard gate wiring check", violations, {
  failAlways: true,
  extraMessage:
    "Required standards checks must be part of the standard verification gate.",
});
