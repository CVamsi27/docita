import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const evidenceDir = path.join(repoRoot, "docs", "audits", "evidence");

const runtimeDirPattern =
  /(^|\/)(node_modules|\.next|\.turbo|\.wrangler|\.astro|dist|coverage|playwright-report|test-results|accessibility-reports|uploads)(\/|$)|^logs\//;

const textFilePattern =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|css|scss|yml|yaml|prisma|sql|toml|env|example)$/;

export function listTrackedFiles() {
  return execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

export function readText(file) {
  try {
    return fs.readFileSync(path.join(repoRoot, file), "utf8");
  } catch {
    return "";
  }
}

export function countLines(text) {
  if (!text) return 0;
  return text.split("\n").length;
}

function hasImportFrom(content, patterns) {
  return patterns.some((pattern) => pattern.test(content));
}

function classifyByName(file) {
  const base = path.basename(file);
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(base) || file.includes("/test/") || file.includes("/tests/") || file.includes("/e2e/")) return "test";
  if (base === "page.tsx" || base === "layout.tsx" || base === "route.ts" || base === "middleware.ts") return "route";
  if (/controller\.(ts|js)$/.test(base)) return "controller";
  if (/service\.(ts|js)$/.test(base)) return "service";
  if (/use-[\w-]+\.(ts|tsx)$/.test(base) || /^use[A-Z]/.test(base)) return "hook";
  if (/repository|repo/.test(base)) return "repository";
  if (/dto|schema|contract/.test(base)) return "schema";
  if (/module\.(ts|js)$/.test(base)) return "module";
  if (/processor\.(ts|js)$/.test(base)) return "processor";
  if (/queue/.test(base)) return "queue";
  if (/\.(tsx|jsx)$/.test(base)) return "component";
  if (/\.(json|jsonc|toml|yml|yaml)$/.test(base)) return "config";
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/.test(base)) return "asset";
  return "script";
}

function statusForIssues(issues) {
  if (issues.some((issue) => issue.severity === "move")) return "move";
  if (issues.some((issue) => issue.severity === "split")) return "split";
  if (issues.some((issue) => issue.severity === "delete")) return "delete";
  if (issues.length > 0) return "review";
  return "keep";
}

function markdownTable(headers, rows) {
  const escape = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, "<br>");

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}

function writeFile(relativePath, content) {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${content.trim()}\n`, "utf8");
}

export function formatFinding(issue) {
  return `${issue.file}: ${issue.message}`;
}

export function printReport(title, issues, { enforce = false } = {}) {
  if (issues.length === 0) {
    console.log(`${title}: no findings.`);
    return;
  }

  console.log(`${title}: ${issues.length} finding(s).`);
  for (const issue of issues.slice(0, 80)) {
    console.log(` - ${formatFinding(issue)}`);
  }
  if (issues.length > 80) {
    console.log(` - ... ${issues.length - 80} more finding(s) omitted`);
  }

  if (enforce) {
    process.exitCode = 1;
  }
}

function frontendTarget(file, type) {
  if (file.startsWith("apps/app/app/")) return "apps/app/app route layer";
  if (file.startsWith("apps/app/features/")) return "apps/app/features/<feature>";
  if (file.startsWith("apps/app/providers/")) return "apps/app/providers";
  if (file.startsWith("apps/app/shared/lib/")) return "apps/app/shared/lib";
  if (file.startsWith("apps/app/shared/hooks/")) return "apps/app/shared/hooks or packages/hooks";
  if (file.startsWith("apps/app/shared/components/")) return "apps/app/features/_shared or packages/ui";
  if (file.startsWith("apps/internal/app/")) return "apps/internal/app route layer";
  if (file.startsWith("apps/internal/features/")) return "apps/internal/features/<feature>";
  if (file.startsWith("apps/internal/shared/components/")) return "apps/internal/features or packages/ui";
  if (file.startsWith("apps/internal/shared/lib/")) return "apps/internal/shared/lib";
  if (file.startsWith("apps/internal/shared/hooks/")) return "apps/internal/shared/hooks or packages/hooks";
  if (file.startsWith("apps/landing/src/pages/")) return "apps/landing/src/pages";
  if (file.startsWith("apps/landing/src/components/")) return "apps/landing/src/components";
  if (file.startsWith("apps/landing/src/layouts/")) return "apps/landing/src/layouts";
  if (file.startsWith("apps/landing/src/lib/")) return "apps/landing/src/lib";
  if (file.startsWith("apps/landing/src/styles/")) return "apps/landing/src/styles";
  return type === "asset" ? "public asset folder" : "frontend canonical structure";
}

function backendTarget(file, type) {
  if (file.startsWith("apps/api/src/domains/")) {
    if (type === "controller") return "apps/api/src/domains/<domain>/presentation/controllers";
    if (type === "repository") return "apps/api/src/domains/<domain>/infrastructure/repositories";
    if (type === "schema") return "apps/api/src/domains/<domain>/application/dto";
    if (type === "service") return "apps/api/src/domains/<domain>/application/services or use-cases";
    return "apps/api/src/domains/<domain>";
  }
  if (file.startsWith("apps/api/src/shared/modules/")) return "apps/api/src/shared/modules";
  if (file.startsWith("apps/api/src/shared/common/")) return "apps/api/src/shared/common (migrated from legacy src/common/)";
  if (file.startsWith("apps/api/src/test-utils/")) return "apps/api/src/test-utils";
  if (file.startsWith("apps/worker/src/domains/")) {
    if (type === "processor") return "apps/worker/src/domains/<domain>/processors";
    if (type === "queue") return "apps/worker/src/domains/<domain>/queues";
    return "apps/worker/src/domains/<domain>";
  }
  if (file.startsWith("apps/worker/src/shared/")) return "apps/worker/src/shared";
  return "backend canonical structure";
}

function createRecord(file, area) {
  const content = textFilePattern.test(file) ? readText(file) : "";
  const type = classifyByName(file);
  const lines = countLines(content);
  const issues = [];
  const target = area === "frontend" ? frontendTarget(file, type) : backendTarget(file, type);

  if (runtimeDirPattern.test(file)) {
    issues.push({
      file,
      severity: "delete",
      message: "tracked generated/runtime artifact should be removed or explicitly allowlisted",
    });
  }

  return { file, type, target, status: "keep", issues, lines, content };
}

export function collectFrontendAudit() {
  const files = listTrackedFiles().filter((file) =>
    /^(apps\/app|apps\/internal|apps\/landing)\//.test(file),
  );
  const records = [];
  const issues = [];

  for (const file of files) {
    const record = createRecord(file, "frontend");
    const { content, type, lines } = record;

    if (/^apps\/app\/app\/.*page\.tsx$/.test(file) && lines > 180) {
      record.issues.push({
        file,
        severity: "split",
        message: `route page is ${lines} lines; route files should compose feature components`,
      });
    }

    if (/^apps\/(app|internal)\/components\//.test(file)) {
      record.issues.push({
        file,
        severity: "move",
        message: "app-level components are transitional; move to a feature, _shared, or packages/ui",
      });
    }

    if (/^apps\/app\/features\/[^/]+\/.*\.(ts|tsx)$/.test(file) && /\bfetch\s*\(/.test(content)) {
      record.issues.push({
        file,
        severity: "review",
        message: "feature file calls fetch; client server state should use packages/data-access",
      });
    }

    if (type === "component" && /^apps\/app\/features\//.test(file) && lines > 400) {
      record.issues.push({
        file,
        severity: "split",
        message: `component is ${lines} lines; split into sections/hooks`,
      });
    }

    if (/^packages\/utils\//.test(file) && hasImportFrom(content, [/from\s+["']react["']/, /from\s+["']next\//])) {
      record.issues.push({
        file,
        severity: "move",
        message: "framework imports do not belong in packages/utils",
      });
    }

    record.status = statusForIssues(record.issues);
    records.push(record);
    issues.push(...record.issues);
  }

  return { records, issues };
}

export function collectBackendAudit() {
  const files = listTrackedFiles().filter((file) =>
    /^(apps\/api|apps\/worker)\//.test(file),
  );
  const records = [];
  const issues = [];

  for (const file of files) {
    const record = createRecord(file, "backend");
    const { content, type, lines } = record;

    if (type === "controller" && /^apps\/api\/src\/domains\//.test(file) && !file.includes("/presentation/")) {
      record.issues.push({
        file,
        severity: "move",
        message: "domain controller should live under presentation/controllers",
      });
    }

    if (type === "controller" && lines > 260) {
      record.issues.push({
        file,
        severity: "split",
        message: `controller is ${lines} lines; keep controllers thin`,
      });
    }

    if (type === "service" && /^apps\/api\/src\/domains\//.test(file) && !file.includes("/application/") && !file.includes("/core/")) {
      record.issues.push({
        file,
        severity: "move",
        message: "domain service should live under application/services, application/use-cases, or core",
      });
    }

    if (
      type !== "test" &&
      /^apps\/api\/src\/domains\/.*\/(presentation|application)\//.test(file) &&
      /@prisma\/client|PrismaService|\bprisma\./.test(content)
    ) {
      record.issues.push({
        file,
        severity: "move",
        message: "Prisma/DB imports should stay in infrastructure repositories or packages/db",
      });
    }

    if (type === "processor" && /^apps\/worker\//.test(file) && !/attempts|backoff|lockDuration|idempot/i.test(content)) {
      record.issues.push({
        file,
        severity: "review",
        message: "worker processor should document retry/backoff, lockDuration, idempotency, and DLQ behavior",
      });
    }

    if (/^apps\/worker\/src\/.*controller\.(ts|js)$/.test(file)) {
      record.issues.push({
        file,
        severity: "move",
        message: "HTTP controller logic does not belong in worker",
      });
    }

    record.status = statusForIssues(record.issues);
    records.push(record);
    issues.push(...record.issues);
  }

  return { records, issues };
}

export function collectRouteThinnessFindings() {
  return collectFrontendAudit().issues.filter((issue) =>
    issue.message.includes("route page"),
  );
}

export function collectApiDomainLayoutFindings() {
  return collectBackendAudit().issues.filter((issue) =>
    /controller|service|Prisma|DB imports/.test(issue.message),
  );
}

export function collectFeatureBoundaryFindings() {
  const files = listTrackedFiles().filter((file) =>
    /^apps\/(app|internal)\/features\/[^/]+\/.*\.(ts|tsx)$/.test(file),
  );
  const issues = [];
  const importPattern = /from\s+["']([^"']+)["']/g;

  for (const file of files) {
    const content = readText(file);
    const match = file.match(/^apps\/(app|internal)\/features\/([^/]+)\//);
    const currentFeature = match?.[2];
    if (!currentFeature) continue;

    for (const importMatch of content.matchAll(importPattern)) {
      const specifier = importMatch[1];
      if (!specifier.startsWith("@/features/")) continue;

      const parts = specifier.split("/");
      const importedFeature = parts[2];
      const importsFeatureInternal = parts.length > 3;

      if (
        importedFeature &&
        importsFeatureInternal &&
        importedFeature !== currentFeature &&
        importedFeature !== "_shared"
      ) {
        issues.push({
          file,
          severity: "review",
          message: `feature imports another feature internals (${importMatch[0]}); prefer package export or _shared`,
        });
      }
    }
  }

  return issues;
}

export function collectPackageBoundaryFindings() {
  const files = listTrackedFiles().filter((file) =>
    /^packages\/(utils|ui|types|data-access|hooks|auth)\//.test(file),
  );
  const issues = [];

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const content = readText(file);

    if (file.startsWith("packages/utils/") && hasImportFrom(content, [/from\s+["']react["']/, /from\s+["']next\//])) {
      issues.push({
        file,
        severity: "move",
        message: "packages/utils must remain framework-agnostic",
      });
    }

    if (file.startsWith("packages/ui/") && /\bfetch\s*\(|@tanstack\/react-query|@workspace\/data-access/.test(content)) {
      issues.push({
        file,
        severity: "move",
        message: "packages/ui must not fetch data or depend on data-access",
      });
    }

    if (file.startsWith("packages/types/") && /@workspace\/db|@prisma\/client/.test(content)) {
      issues.push({
        file,
        severity: "move",
        message: "packages/types must be DB-agnostic",
      });
    }
  }

  return issues;
}

function auditMarkdown(title, records) {
  const rows = records.map((record) => [
    record.file,
    record.type,
    record.target,
    record.status,
    record.issues.map((issue) => issue.message).join("; ") || "none",
    testsForRecord(record),
    ownerForRecord(record),
  ]);

  return `# ${title}

Generated by structure audit tooling. This is a report-mode artifact; proposed moves must be reviewed before implementation.

${markdownTable(
  [
    "Current path",
    "Classification",
    "Correct target",
    "Status",
    "Boundary concerns",
    "Required tests/checks",
    "Owner workstream",
  ],
  rows,
)}`;
}

function findingsMarkdown(title, issues) {
  const rows = issues.map((issue) => [
    issue.file,
    issue.severity,
    issue.message,
    suggestedAction(issue),
  ]);

  return `# ${title}

${issues.length === 0 ? "No findings." : markdownTable(["File", "Severity", "Finding", "Suggested action"], rows)}`;
}

function moveMapMarkdown(frontendRecords, backendRecords) {
  const records = [...frontendRecords, ...backendRecords].filter((record) =>
    ["move", "split", "delete", "archive", "review"].includes(record.status),
  );
  const rows = records.map((record) => [
    record.file,
    record.type,
    record.target,
    record.status,
    record.issues.map((issue) => issue.message).join("; "),
    testsForRecord(record),
  ]);

  return `# 2026-05 File Move Map

This map is generated in report mode. Do not move files until each row is reviewed and batched into a small PR.

${records.length === 0 ? "No move/refactor candidates detected." : markdownTable(["Current file", "Type", "Correct location", "Action", "Reason", "Tests"], rows)}`;
}

function testsForRecord(record) {
  if (record.file.startsWith("apps/api/")) return "api lint; api tests; controller contract if route-facing";
  if (record.file.startsWith("apps/worker/")) return "worker lint; worker tests";
  if (record.file.startsWith("apps/app/")) return "app lint; app typecheck; app tests/audit where UI-facing";
  if (record.file.startsWith("apps/internal/")) return "internal lint; internal typecheck; internal audit where UI-facing";
  if (record.file.startsWith("apps/landing/")) return "landing lint; landing accessibility/critical-flow tests";
  return "relevant workspace checks";
}

function ownerForRecord(record) {
  if (record.file.startsWith("apps/api/")) return "WS-backend-structure";
  if (record.file.startsWith("apps/worker/")) return "WS-worker-structure";
  if (record.file.startsWith("apps/app/")) return "WS-frontend-app-structure";
  if (record.file.startsWith("apps/internal/")) return "WS-internal-structure";
  if (record.file.startsWith("apps/landing/")) return "WS-landing-structure";
  return "WS-package-boundaries";
}

function suggestedAction(issue) {
  if (issue.severity === "move") return "review target folder and move behind index.ts re-export";
  if (issue.severity === "split") return "split after characterization tests";
  if (issue.severity === "delete") return "remove from git or document allowlist";
  return "review and either fix or document exception";
}

export function writeStructureEvidence() {
  const frontend = collectFrontendAudit();
  const backend = collectBackendAudit();

  writeFile(
    "docs/audits/evidence/2026-05-frontend-file-audit.md",
    auditMarkdown("2026-05 Frontend File Audit", frontend.records),
  );
  writeFile(
    "docs/audits/evidence/2026-05-backend-file-audit.md",
    auditMarkdown("2026-05 Backend File Audit", backend.records),
  );
  writeFile(
    "docs/audits/evidence/2026-05-frontend-structure-findings.md",
    findingsMarkdown("2026-05 Frontend Structure Findings", frontend.issues),
  );
  writeFile(
    "docs/audits/evidence/2026-05-backend-structure-findings.md",
    findingsMarkdown("2026-05 Backend Structure Findings", backend.issues),
  );
  writeFile(
    "docs/audits/evidence/2026-05-file-move-map.md",
    moveMapMarkdown(frontend.records, backend.records),
  );

  return {
    frontendIssues: frontend.issues.length,
    backendIssues: backend.issues.length,
  };
}
