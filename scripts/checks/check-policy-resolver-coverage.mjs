#!/usr/bin/env node
// Fail-closed posture gate (ABAC Phase A2): every @RequirePolicy(resource, ...)
// usage in apps/api must have a registered resolver, or the guard 403s at
// runtime. Catches the misconfiguration class statically.
import fs from "node:fs";
import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

const controllerFiles = gitLsSourceFiles(["apps/api/src"], {
  include: [/\.controller\.ts$/],
});

// Only literal lowercase-hyphen resource names are matched. A dynamic
// resource argument (e.g. @RequirePolicy(resourceVar, ...)) would escape
// coverage — do not introduce one without extending this gate.
const usageRe = /@RequirePolicy\(\s*["']([a-z-]+)["']/g;
const usage = new Map(); // resource -> sites[]

for (const file of controllerFiles) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    let match;
    usageRe.lastIndex = 0;
    while ((match = usageRe.exec(line)) !== null) {
      const resource = match[1];
      if (!usage.has(resource)) usage.set(resource, []);
      usage.get(resource).push(`${file}:${index + 1}`);
    }
  });
}

const registryFile =
  "apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts";
const registryText = fs.existsSync(registryFile)
  ? fs.readFileSync(registryFile, "utf8")
  : "";

const violations = [];
for (const [resource, sites] of usage.entries()) {
  const resolverFile = `apps/api/src/shared/modules/auth/authorization/resolvers/${resource}-resource.resolver.ts`;
  const hasFile = fs.existsSync(resolverFile);
  const hasRegistration = new RegExp(`\\['${resource}',`).test(registryText);
  if (!hasFile || !hasRegistration) {
    violations.push(
      `${sites.join(", ")}: @RequirePolicy('${resource}') has no resolver ` +
        `(missing ${resolverFile} or registration in ${registryFile})`,
    );
  }
}

reportFindingsAndExit("ABAC policy-resolver coverage check", violations, {
  failAlways: true,
});
