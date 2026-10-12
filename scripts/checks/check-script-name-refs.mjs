#!/usr/bin/env node

// Checks that every `pnpm <script>` reference outside CI workflows resolves to
// a real script name. Covers three surfaces check:workflow-script-refs does not:
//
//   1. Manifest script chains (root and workspace packages). Inside a script
//      body pnpm resolves bare names against that manifest only — verified
//      empirically: a child package cannot run a root script by bare name
//      (exit 254), so this context is strict.
//   2. Git hooks (.husky/*), which run from the repo root.
//   3. Docs (tracked `*.md`). Bare names resolve against root + any workspace
//      package, so documented sub-package shorthand (`pnpm db:check-integrity`
//      from `packages/db`) is tolerated; the gate still fails on names that
//      exist nowhere — the rename/removal drift class.
//
// Motivation (2026-10-06): root package.json lost 13 script entries while
// verify:standard, .husky/pre-push and docs still invoked them — nothing
// failed until push/gate time. The same day `check:worker-size` chained a
// landing wrapper that existed only in apps/landing/package.json, where root
// `pnpm` cannot resolve it (exit 254 when the chain ran). This check fails at
// verify time instead of at run time.
//
// Non-script tokens are skipped conservatively: pnpm builtins without `run`,
// flag tokens (`--offline`), version/count tokens (`pnpm 10.30.3`) and
// placeholders (`...`, `*`). Markdown prose outside code spans/fences is not
// scanned — only inline code and fenced command blocks are treated as
// commands.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";
import {
  loadRootScripts,
  loadWorkspacePackages,
  parsePnpmInvocations,
  PNPM_BUILTINS,
} from "../lib/pnpm-script-refs.mjs";

const ROOT = process.cwd();
const ROOT_BIN_DIR = path.join(ROOT, "node_modules", ".bin");
const findings = [];

// Deliberate references to scripts that are documented as missing (see each
// entry's `reason`); the docs are the defect record, not drift.
let allowlist = [];
try {
  allowlist = JSON.parse(
    readFileSync(
      path.join(ROOT, "scripts/checks/allowlists/script-name-refs.json"),
      "utf8",
    ),
  );
} catch {
  // No allowlist — every reference must resolve.
}

const rootScripts = loadRootScripts(ROOT);
const packages = loadWorkspacePackages(ROOT);

// Docs resolve bare names against root + any workspace package (shorthand
// tolerance); manifests and hooks resolve strictly against their own context.
const unionScripts = { ...rootScripts };
for (const pkg of packages.values()) {
  Object.assign(unionScripts, pkg.scripts);
}

/**
 * @param {{ filter: string | null, explicitRun: boolean, script: string }} inv
 * @param {{ scripts: Record<string, string>, label: string, binDirs: string[] }} ctx
 * @returns {string | null} finding message, or null when the reference resolves
 */
function resolveInvocation(inv, ctx) {
  if (!inv.explicitRun && PNPM_BUILTINS.has(inv.script)) return null;
  if (inv.script.startsWith("-")) return null;
  if (/^\d/.test(inv.script) || /^[.\-*]+$/.test(inv.script) || inv.script.includes("*")) {
    // Versions (`pnpm 10.30.3`), ellipsis placeholders (`pnpm ...`) and
    // glob patterns (`check:*-imports`) are not script names.
    return null;
  }

  if (inv.filter) {
    if (/[*{[\]}<]/.test(inv.filter)) return null;
    let pkg = packages.get(inv.filter);
    if (!pkg && (inv.filter.startsWith(".") || inv.filter.startsWith("/"))) {
      const target = path.resolve(ROOT, inv.filter);
      pkg = [...packages.values()].find(
        (p) => p.dir === target || target.startsWith(p.dir + path.sep),
      );
    }
    if (!pkg) {
      return `unknown workspace package "${inv.filter}" (no matching package.json name under apps/ or packages/)`;
    }
    if (!(inv.script in pkg.scripts)) {
      return `script "${inv.script}" missing from ${inv.filter} (${path.relative(ROOT, pkg.path)})`;
    }
    return null;
  }

  if (inv.script in ctx.scripts) return null;
  if (!inv.explicitRun && ctx.binDirs.some((d) => existsSync(path.join(d, inv.script)))) {
    return null;
  }
  return `script "${inv.script}" not found in ${ctx.label}`;
}

/**
 * Scan one command-bearing line and record findings.
 *
 * @param {string} command
 * @param {string} where - `file:line` location for the finding
 * @param {{ scripts: Record<string, string>, label: string, binDirs: string[] }} ctx
 */
function scanCommand(command, where, ctx) {
  // Strip shell comments (` #...`): prose after a hash is not executed, and
  // docs routinely annotate commands with sentences mentioning pnpm.
  const line = command.replace(/\s+#.*$/, "");
  if (!line.includes("pnpm")) return;
  for (const inv of parsePnpmInvocations(line)) {
    const error = resolveInvocation(inv, ctx);
    if (!error) continue;
    const rendered = `${inv.filter ? `--filter ${inv.filter} ` : ""}${inv.explicitRun ? "run " : ""}${inv.script}`;
    findings.push(`${where} — \`pnpm ${rendered}\`: ${error}. Command: \`${command.trim()}\``);
  }
}

/** Scan a shell-like file (manifest bodies, hooks) line by line. */
function scanLines(file, text, ctx) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    scanCommand(lines[i], `${file}:${i + 1}`, ctx);
  }
}

/**
 * Scan a markdown file: fenced code blocks are commands; outside fences only
 * inline code spans are considered (prose mentions are not commands).
 */
function scanMarkdown(file, text) {
  const ctx = { scripts: unionScripts, label: "root or a workspace package manifest", binDirs: [ROOT_BIN_DIR] };
  const lines = text.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      scanCommand(line, `${file}:${i + 1}`, ctx);
      continue;
    }
    for (const span of line.matchAll(/`([^`\n]+)`/g)) {
      scanCommand(span[1], `${file}:${i + 1}`, ctx);
    }
  }
}

// --- 1. Root manifest chain -------------------------------------------------
scanLines("package.json", readFileSync(path.join(ROOT, "package.json"), "utf8"), {
  scripts: rootScripts,
  label: "the root package.json",
  binDirs: [ROOT_BIN_DIR],
});

// --- 2. Workspace package manifest chains -----------------------------------
for (const [name, pkg] of packages.entries()) {
  const file = path.relative(ROOT, pkg.path);
  scanLines(file, readFileSync(pkg.path, "utf8"), {
    scripts: pkg.scripts,
    label: `${name} (${file})`,
    binDirs: [path.join(pkg.dir, "node_modules", ".bin"), ROOT_BIN_DIR],
  });
}

// --- 3. Git hooks -----------------------------------------------------------
const HUSKY_DIR = path.join(ROOT, ".husky");
if (existsSync(HUSKY_DIR)) {
  for (const entry of readdirSync(HUSKY_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const file = path.join(".husky", entry.name);
    scanLines(file, readFileSync(path.join(ROOT, file), "utf8"), {
      scripts: rootScripts,
      label: "the root package.json (hooks run from the repo root)",
      binDirs: [ROOT_BIN_DIR],
    });
  }
}

// --- 4. Docs ----------------------------------------------------------------
let docFiles = [];
try {
  docFiles = execSync("git ls-files '*.md'", { encoding: "utf8", cwd: ROOT })
    .split("\n")
    .filter((f) => f.endsWith(".md") && existsSync(path.join(ROOT, f)));
} catch {
  // Not a git checkout (fixtures always are); fall back to nothing.
}
for (const file of docFiles) {
  scanMarkdown(file, readFileSync(path.join(ROOT, file), "utf8"));
}

const visible = findings.filter(
  (f) =>
    !allowlist.some(
      (entry) => f.startsWith(`${entry.file}:`) && f.includes(entry.script),
    ),
);

reportFindingsAndExit("Script name reference check", visible, {
  failAlways: true,
  extraMessage:
    "Every documented or chained `pnpm <script>` name must exist in the resolved manifest. Fix the reference or restore the script; a missing name breaks verify:standard, a push hook, or a command readers copy-paste.",
});
