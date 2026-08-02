#!/usr/bin/env node

/**
 * Detect circular module dependencies inside each app/package source root.
 *
 * Rationale: §15 of AGENTS.md codifies layering invariants but does not directly
 * catch import cycles (a -> b -> a) that can sneak in via barrel files or DI
 * tokens. Cycles cause NestJS providers to resolve as `undefined`, force
 * `forwardRef()` workarounds, and break tree-shaking in the Vite apps.
 *
 * Implementation: shells out to `madge --circular --json` for each project root
 * with its own tsconfig so path aliases (`@/...`, `@workspace/...`) resolve
 * correctly. Aggregates findings, exits non-zero only with --enforce.
 *
 * Modes:
 *   warn (default): prints findings, exits 0. Use when triaging an existing
 *     baseline or running ad hoc during refactors.
 *   --enforce:      exits 1 if any cycles found. Run in CI and verify:standard.
 *
 * Allowlist: cycles that are intentional and load-bearing (e.g. domain
 * aggregates that genuinely need bidirectional references) can be added to
 * KNOWN_CYCLES below with a one-line justification. Prefer fixing over
 * allowlisting.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");

/**
 * Project roots to scan. Each entry shells out to `madge` with its own
 * tsconfig so path aliases resolve. `src` is the entry point passed to madge;
 * madge then walks every import reachable from there.
 */
const projects = [
  {
    label: "apps/api",
    entry: "apps/api/src",
    tsconfig: "apps/api/tsconfig.json",
  },
  {
    label: "apps/worker",
    entry: "apps/worker/src",
    tsconfig: "apps/worker/tsconfig.json",
  },
  {
    label: "apps/app-vite",
    entry: "apps/app-vite",
    tsconfig: "apps/app-vite/tsconfig.json",
    exclude: "^(build|dist|public)/",
  },
  {
    label: "apps/internal-vite",
    entry: "apps/internal-vite",
    tsconfig: "apps/internal-vite/tsconfig.json",
    exclude: "^(build|dist|public)/",
  },
  {
    label: "packages/data-access",
    entry: "packages/data-access/src",
    tsconfig: "packages/data-access/tsconfig.json",
  },
  {
    label: "packages/ui",
    entry: "packages/ui/src",
    tsconfig: "packages/ui/tsconfig.json",
  },
  {
    label: "packages/types",
    entry: "packages/types/src",
    tsconfig: "packages/types/tsconfig.json",
  },
  {
    label: "packages/utils",
    entry: "packages/utils/src",
    tsconfig: "packages/utils/tsconfig.json",
  },
  {
    label: "packages/hooks",
    entry: "packages/hooks/src",
    tsconfig: "packages/hooks/tsconfig.json",
  },
  {
    label: "packages/auth",
    entry: "packages/auth/src",
    tsconfig: "packages/auth/tsconfig.json",
  },
];

/**
 * Allowlisted cycles. Add only with a justification comment. Each entry is the
 * canonicalized cycle key (see canonicalizeCycle): the cycle is rotated to
 * start with its lexicographically smallest member, so the same logical cycle
 * matches regardless of which file madge walked into first.
 */
const KNOWN_CYCLES = new Set([
  // NestJS forwardRef() module cycles. Both modules use `forwardRef(() => X)`
  // in their `imports:` block, which is Nest's blessed mechanism for legitimate
  // bidirectional module dependencies. TypeScript still needs the static class
  // import for the symbol to exist at `forwardRef(() => X)` evaluation time,
  // so the file-level cycle is unavoidable without splitting the modules into
  // a third "interfaces" module. Track in docs/architecture if a split happens.
  "domains/clinics/clinics.module.ts -> shared/modules/auth/auth/auth.module.ts",
  "domains/whatsapp/whatsapp-clinic.module.ts -> shared/modules/support-whatsapp/index.ts -> shared/modules/support-whatsapp/support-whatsapp.module.ts",
  // Worker scans the same files through `../../api/src/...` paths.
  "../../api/src/domains/clinics/clinics.module.ts -> ../../api/src/shared/modules/auth/auth/auth.module.ts",
  "../../api/src/domains/whatsapp/whatsapp-clinic.module.ts -> ../../api/src/shared/modules/support-whatsapp/index.ts -> ../../api/src/shared/modules/support-whatsapp/support-whatsapp.module.ts",
  // consultation-dashboard-helpers re-exports `buildDoctorNowNext` from
  // consultation-doctor-now-next, which imports the DashboardAppointment /
  // DoctorNextUpRow types and `buildQueueNextUpRow` from the helpers module.
  // Both are value/type-only and resolve at compile time; resolution order
  // works because TypeScript handles type-only cycles gracefully. Splitting
  // the types into a third file would add noise without changing the
  // runtime shape, so we accept this cycle.
  "features/consultation/hooks/consultation-dashboard-helpers.ts -> features/consultation/hooks/consultation-doctor-now-next.ts",
  // today-page-content-sections lazy-loads today-right-rail (React.lazy
  // import) and today-right-rail imports the TodayRightRailSection type
  // from today-page-content-sections. Type-only cycle; React.lazy
  // resolution is independent. Splitting types would fragment the section
  // vocabulary without runtime benefit.
  "features/dashboard/components/today/today-page-content-sections.tsx -> features/dashboard/components/today/today-right-rail.tsx",
]);

/** Rotate cycle so it starts at the lexicographically smallest entry. */
function canonicalizeCycle(cycle) {
  if (!Array.isArray(cycle) || cycle.length === 0) return cycle;
  let pivot = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[pivot]) pivot = i;
  }
  return [...cycle.slice(pivot), ...cycle.slice(0, pivot)];
}

const findings = [];

for (const project of projects) {
  const entryPath = path.join(repoRoot, project.entry);
  if (!fs.existsSync(entryPath)) continue;

  const args = [
    "madge",
    "--circular",
    "--json",
    "--no-spinner",
    "--no-color",
    "--extensions",
    "ts,tsx",
    "--ts-config",
    project.tsconfig,
  ];
  if (project.exclude) {
    args.push("--exclude", project.exclude);
  }
  args.push(project.entry);

  let raw;
  try {
    raw = execFileSync("pnpm", ["exec", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    // madge exits non-zero when cycles are found AND outputs JSON on stdout.
    if (err.stdout) {
      raw = err.stdout.toString();
    } else {
      console.error(
        `check:circular: madge failed for ${project.label}: ${err.message}`,
      );
      if (enforce) process.exit(1);
      continue;
    }
  }

  let cycles;
  try {
    cycles = JSON.parse(raw);
  } catch (err) {
    console.error(
      `check:circular: could not parse madge output for ${project.label}: ${err.message}`,
    );
    if (enforce) process.exit(1);
    continue;
  }

  if (!Array.isArray(cycles)) continue;

  for (const cycle of cycles) {
    const canonical = canonicalizeCycle(cycle);
    const key = canonical.join(" -> ");
    if (KNOWN_CYCLES.has(key)) continue;
    findings.push({ project: project.label, cycle: canonical });
  }
}

if (findings.length === 0) {
  console.log("Circular dependency check passed.");
  process.exit(0);
}

const intro = enforce
  ? "Circular dependency check failed."
  : "Circular dependency report:";
console.error(`${intro}\n`);
for (const { project, cycle } of findings) {
  console.error(`- [${project}] ${cycle.join(" -> ")} -> ${cycle[0]}`);
}
console.error(
  `\n${findings.length} circular dependency chain(s). ` +
    (enforce
      ? "Resolve cycles or add a justified entry to KNOWN_CYCLES."
      : "Run with --enforce to fail."),
);

if (enforce) process.exit(1);
