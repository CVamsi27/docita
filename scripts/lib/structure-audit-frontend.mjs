import {
  listTrackedFiles,
} from "./structure-audit-file-system.mjs";
import {
  createRecord,
  statusForIssues,
} from "./structure-audit-record.mjs";
import { hasImportFrom } from "./structure-audit-imports.mjs";

const frontendTargets = [
  ["apps/app/app/", "apps/app/app route layer"],
  ["apps/app/features/", "apps/app/features/<feature>"],
  ["apps/app/providers/", "apps/app/providers"],
  ["apps/app/shared/lib/", "apps/app/shared/lib"],
  ["apps/app/shared/hooks/", "apps/app/shared/hooks or packages/hooks"],
  ["apps/app/shared/components/", "apps/app/features/_shared or packages/ui"],
  ["apps/internal/app/", "apps/internal/app route layer"],
  ["apps/internal/features/", "apps/internal/features/<feature>"],
  ["apps/internal/shared/components/", "apps/internal/features or packages/ui"],
  ["apps/internal/shared/lib/", "apps/internal/shared/lib"],
  ["apps/internal/shared/hooks/", "apps/internal/shared/hooks or packages/hooks"],
  ["apps/landing/src/pages/", "apps/landing/src/pages"],
  ["apps/landing/src/components/", "apps/landing/src/components"],
  ["apps/landing/src/layouts/", "apps/landing/src/layouts"],
  ["apps/landing/src/lib/", "apps/landing/src/lib"],
  ["apps/landing/src/styles/", "apps/landing/src/styles"],
];

function frontendTarget(file, type) {
  const target = frontendTargets.find(([prefix]) => file.startsWith(prefix))?.[1];
  if (target) return target;
  return type === "asset" ? "public asset folder" : "frontend canonical structure";
}

function routeThinnessIssue(file, record) {
  if (!/^apps\/app\/app\/.*page\.tsx$/.test(file) || record.lines <= 180) return [];
  return [{
    file,
    severity: "split",
    message: `route page is ${record.lines} lines; route files should compose feature components`,
  }];
}

function appLevelComponentIssue(file) {
  if (!/^apps\/(app|internal)\/components\//.test(file)) return [];
  return [{
    file,
    severity: "move",
    message: "app-level components are transitional; move to a feature, _shared, or packages/ui",
  }];
}

function featureFetchIssue(file, record) {
  if (!/^apps\/app\/features\/[^/]+\/.*\.(ts|tsx)$/.test(file) || !/\bfetch\s*\(/.test(record.content)) return [];
  return [{
    file,
    severity: "review",
    message: "feature file calls fetch; client server state should use packages/data-access",
  }];
}

function largeFeatureComponentIssue(file, record) {
  if (record.type !== "component" || !/^apps\/app\/features\//.test(file) || record.lines <= 400) return [];
  return [{
    file,
    severity: "split",
    message: `component is ${record.lines} lines; split into sections/hooks`,
  }];
}

function utilsFrameworkImportIssue(file, record) {
  if (!/^packages\/utils\//.test(file) || !hasImportFrom(record.content, [/from\s+["']react["']/, /from\s+["']next\//])) return [];
  return [{
    file,
    severity: "move",
    message: "framework imports do not belong in packages/utils",
  }];
}

const frontendRules = [
  routeThinnessIssue,
  appLevelComponentIssue,
  featureFetchIssue,
  largeFeatureComponentIssue,
  utilsFrameworkImportIssue,
];

export function collectFrontendAudit() {
  const files = listTrackedFiles().filter((file) =>
    /^(apps\/app|apps\/internal|apps\/landing)\//.test(file),
  );
  const records = [];
  const issues = [];

  for (const file of files) {
    const record = createRecord(file, frontendTarget);
    record.issues.push(...frontendRules.flatMap((rule) => rule(file, record)));

    record.status = statusForIssues(record.issues);
    records.push(record);
    issues.push(...record.issues);
  }

  return { records, issues };
}
