#!/usr/bin/env node

// Checks that every `pnpm` script invocation in `.github/workflows/*.yml`
// `run:` steps resolves to a real script in the targeted package manifest
// (or the root manifest for unfiltered invocations).
//
// Catches the fail-fast class: a workflow referencing
// `pnpm --filter @docita/internal run deploy:cloudflare:production` when that
// script has been renamed/removed, or a `--filter` package name that no longer
// exists under apps/ or packages/. CI would otherwise only discover the break
// at deploy time (or never, if the job is path-filtered away).
//
// Scope: `run:` step values (single-line and `|`/`>` block scalars). Non-script
// pnpm invocations (`pnpm install`, `pnpm exec ...`, `pnpm dlx ...`) and
// non-command mentions (`cache: "pnpm"`, `pnpm-lock.yaml`) are ignored.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";

const ROOT = process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");

// pnpm built-in commands. When used WITHOUT an explicit `run` prefix these are
// not script invocations (e.g. `pnpm exec playwright`, `pnpm dlx knip`).
// Tradeoff: bare root `pnpm test`/`pnpm start` in a workflow are skipped even
// though both are real root scripts here — conservative direction (no false
// positives), and workflows always use explicit `run`, so no coverage loss.
const PNPM_BUILTINS = new Set([
  "install",
  "i",
  "add",
  "remove",
  "rm",
  "update",
  "up",
  "dlx",
  "exec",
  "run",
  "start",
  "test",
  "help",
  "init",
  "create",
  "list",
  "ls",
  "why",
  "info",
  "view",
  "config",
  "env",
  "store",
  "pack",
  "publish",
  "rebuild",
  "prune",
  "link",
  "unlink",
  "patch",
  "patch-commit",
  "patch-remove",
  "dedupe",
  "fetch",
  "import",
  "export",
  "root",
  "bin",
  "server",
  "deploy",
  "recursive",
  "filter",
  "approve-builds",
  "setup",
  "wizard",
  "--version",
  "-v",
  "--help",
  "-h",
]);

/** @returns {Map<string, { scripts: Record<string, string>, path: string }>} */
function loadWorkspacePackages() {
  const map = new Map();
  let globs = ["apps/*", "packages/*"];
  try {
    const ws = readFileSync(path.join(ROOT, "pnpm-workspace.yaml"), "utf8");
    const found = [...ws.matchAll(/^\s*-\s*"?([^"\n#]+?)"?\s*$/gm)]
      .map((m) => m[1].trim())
      .filter((g) => g.includes("*") || g.endsWith("/"));
    if (found.length > 0) globs = found;
  } catch {
    // Fall back to the conventional layout.
  }
  for (const glob of globs) {
    const base = glob.replace(/\*+$/, "").replace(/\/+$/, "");
    let entries = [];
    try {
      entries = readdirSync(path.join(ROOT, base), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(ROOT, base, entry.name, "package.json");
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (typeof pkg.name === "string" && pkg.name.length > 0) {
          map.set(pkg.name, { scripts: pkg.scripts ?? {}, path: pkgPath });
        }
      } catch {
        // Invalid manifest; leave it out and let a later check surface it.
      }
    }
  }
  return map;
}

/** @returns {Record<string, string>} root package.json scripts */
function loadRootScripts() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Collect the command text of every `run:` step (single-line values and
 * block-scalar bodies) with 1-based line numbers.
 *
 * @param {string} text
 * @returns {{ lineNo: number, command: string }[]}
 */
function collectCommandLines(text) {
  const lines = text.split(/\r?\n/);
  const commands = [];
  let inBlock = false;
  let blockKeyIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^\s*/)[0].length;
    if (inBlock) {
      if (line.trim() === "") continue;
      if (indent <= blockKeyIndent) {
        inBlock = false;
      } else {
        if (!line.trim().startsWith("#")) {
          commands.push({ lineNo: i + 1, command: line.trim() });
        }
        continue;
      }
    }
    const m = line.match(/^\s*(?:-\s*)?run:\s*(.*)$/);
    if (!m) continue;
    const value = m[1].trim();
    if (value === "" || /^[|>]/.test(value)) {
      inBlock = true;
      blockKeyIndent = indent;
      continue;
    }
    if (value.startsWith("#")) continue;
    commands.push({ lineNo: i + 1, command: value });
  }
  return commands;
}

/**
 * Extract `pnpm` script invocations from a single command string.
 * Stops each match at shell operators (`&&`, `;`, `|`, `>`, `<`).
 *
 * @param {string} command
 * @returns {{ filter: string | null, explicitRun: boolean, script: string }[]}
 */
function parseCommand(command) {
  const runs = [];
  const re =
    /(?:^|[\s&;|(])(pnpm)(?:\s+(?:--filter(?:\s+|=)([^\s]+)|-F\s+([^\s]+)))?[\s]+(?:(run)\s+)?([^\s&|;<>]+)/g;
  for (const m of command.matchAll(re)) {
    const [, , filter, filterShort, runFlag, script] = m;
    if (!script) continue;
    runs.push({
      filter: filter ?? filterShort ?? null,
      explicitRun: Boolean(runFlag),
      script,
    });
  }
  return runs;
}

const packages = loadWorkspacePackages();
const rootScripts = loadRootScripts();
const findings = [];

if (!existsSync(WORKFLOWS_DIR)) {
  reportFindingsAndExit("Workflow script reference check", [
    `no ${path.relative(ROOT, WORKFLOWS_DIR)} directory found`,
  ]);
}

for (const file of readdirSync(WORKFLOWS_DIR)) {
  if (!/\.ya?ml$/.test(file)) continue;
  const text = readFileSync(path.join(WORKFLOWS_DIR, file), "utf8");
  for (const { lineNo, command } of collectCommandLines(text)) {
    for (const run of parseCommand(command)) {
      // Non-script pnpm builtins (install/exec/dlx/...) without `run`.
      if (!run.explicitRun && PNPM_BUILTINS.has(run.script)) continue;
      // Dynamic --filter patterns can't be resolved statically.
      if (run.filter && /[*{[\]}]/.test(run.filter)) continue;

      if (run.filter) {
        const pkg = packages.get(run.filter);
        if (!pkg) {
          findings.push(
            `${file}:${lineNo} — \`pnpm --filter ${run.filter} ...\`: unknown workspace package "${run.filter}" (no matching package.json name under apps/ or packages/). Command: \`${command}\``,
          );
          continue;
        }
        if (!(run.script in pkg.scripts)) {
          findings.push(
            `${file}:${lineNo} — \`pnpm --filter ${run.filter} run ${run.script}\`: script "${run.script}" missing from ${run.filter} (${path.relative(ROOT, pkg.path)}). Command: \`${command}\``,
          );
        }
        continue;
      }

      if (!(run.script in rootScripts)) {
        findings.push(
          `${file}:${lineNo} — \`pnpm run ${run.script}\`: script "${run.script}" missing from the root package.json. Command: \`${command}\``,
        );
      }
    }
  }
}

reportFindingsAndExit("Workflow script reference check", findings, {
  failAlways: true,
  extraMessage:
    "Every pnpm script referenced in a workflow run step must exist in the target package manifest. Fix the workflow or restore the script; a missing reference breaks CI at deploy time.",
});
