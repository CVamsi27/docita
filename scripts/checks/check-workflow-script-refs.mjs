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
//
// Also validates workflow shape before scanning: every `*.yml`/`*.yaml` file
// must parse as YAML, declare a non-empty `jobs:` map, and pass hand-rolled
// structural GitHub Actions rules — non-empty top-level `on`, every job a map
// with a valid `runs-on` (string, string array, or map) and either non-empty
// `steps` whose steps each wire `uses` or `run`, or a job-level `uses`
// (reusable workflow), and `matrix.*` references only where `strategy.matrix`
// exists. A step that wires `uses`/`run` necessarily wires a recognized step
// field, so that requirement holds by construction. Two repo realities are
// honoured: `uses:`-style jobs carry no `runs-on` (the called workflow
// supplies the runner), and a deliberately paused workflow — one of the
// `PAUSED_WORKFLOWS` entries — keeps its commented-out `# on:` marker with no
// trigger block. The pause exemption is file-scoped: an allowlisted file must
// still carry the marker, and any other workflow with an absent or empty
// `on` fails even when the marker is present (commenting out a live
// workflow's trigger is the content-loss signature, not a pause). The rules are deliberately
// small and dependency-free — GitHub's full JSON schema is not fetched. The
// run-step scanner below is a line reader, so a workflow file replaced by
// non-YAML content (a copied doc, a truncated write) would otherwise be
// scanned vacuously and pass — and the only other YAML validator in the repo
// is the ruby step inside ci.yml itself, self-hosted in the file it validates.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { LineCounter, parseDocument } from "yaml";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";
import {
  loadRootScripts,
  loadWorkspacePackages,
  parsePnpmInvocations,
  PNPM_BUILTINS,
} from "../lib/pnpm-script-refs.mjs";

const ROOT = process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");

// Workflows permitted to ship without a trigger block: this repo pauses a
// workflow by commenting out its `on:` block ("To re-enable, uncomment the
// `on:` block below"). The exemption is deliberately file-scoped so that
// the same edit on any other workflow — ci.yml included — still fails.
const PAUSED_WORKFLOWS = new Set(["deploy.yml", "db-migrations.yml"]);

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

const packages = loadWorkspacePackages(ROOT);
const rootScripts = loadRootScripts(ROOT);
const findings = [];

/**
 * Structural rules for a parseable GitHub Actions workflow. Hand-rolled on
 * purpose: no network, no JSON-schema download, explicit small checks in the
 * repo's check style.
 *
 * @param {string} file - workflow file name (for `file:line` findings)
 * @param {import("yaml").Document} doc - parsed document (node ranges → lines)
 * @param {import("yaml").LineCounter} lineCounter
 * @param {unknown} workflow - `doc.toJS()` value
 * @param {Record<string, unknown>} jobs - the (non-empty) jobs map
 * @param {string} text - raw file text (paused-workflow `# on:` marker)
 * @returns {string[]}
 */
function validateWorkflowShape(file, doc, lineCounter, workflow, jobs, text) {
  const found = [];
  const lineOf = (nodePath, fallback) => {
    try {
      const node = doc.getIn(nodePath, true);
      if (node && Array.isArray(node.range)) {
        return lineCounter.linePos(node.range[0]).line;
      }
    } catch {
      // Path absent from the document; fall back below.
    }
    return fallback;
  };

  const on = /** @type {any} */ (workflow).on;
  const onNonEmpty =
    (typeof on === "string" && on.trim() !== "") ||
    (Array.isArray(on) && on.length > 0) ||
    (on !== null &&
      typeof on === "object" &&
      !Array.isArray(on) &&
      Object.keys(on).length > 0);
  // Deliberately paused workflows: this repo disables one by commenting out
  // its `on:` block ("To re-enable, uncomment the `on:` block below"). An
  // absent `on` is accepted only for an allowlisted file that still carries
  // the commented `# on:` marker; any other missing-`on` file — and any
  // present-but-empty `on:` — is the content-loss signature and fails.
  const documentedPause =
    on === undefined &&
    PAUSED_WORKFLOWS.has(file) &&
    /^[\t ]*#[\t ]*on:/m.test(text);
  if (on !== undefined ? !onNonEmpty : !documentedPause) {
    found.push(
      `${file}:${lineOf(["on"], 1)} — top-level \`on\` is missing or empty (expected a non-empty trigger string, list, or map; a paused workflow must be listed in PAUSED_WORKFLOWS and keep its commented-out \`# on:\` marker).`,
    );
  }

  for (const [name, job] of Object.entries(jobs)) {
    const jobPath = ["jobs", name];
    const jobLine = lineOf(jobPath, 1);
    if (job === null || typeof job !== "object" || Array.isArray(job)) {
      found.push(
        `${file}:${jobLine} — jobs.${name} must be a map (got ${job === null ? "null" : Array.isArray(job) ? "array" : typeof job}).`,
      );
      continue;
    }

    const strategy = /** @type {any} */ (job).strategy;
    const hasMatrixStrategy =
      strategy !== null &&
      typeof strategy === "object" &&
      !Array.isArray(strategy) &&
      strategy.matrix !== undefined;
    if (!hasMatrixStrategy && /\bmatrix\./.test(JSON.stringify(job))) {
      found.push(
        `${file}:${jobLine} — jobs.${name} references \`matrix.*\` but has no \`strategy.matrix\`.`,
      );
    }

    if (/** @type {any} */ (job).uses !== undefined) {
      const uses = /** @type {any} */ (job).uses;
      if (typeof uses !== "string" || uses.trim() === "") {
        found.push(
          `${file}:${lineOf([...jobPath, "uses"], jobLine)} — jobs.${name}.\`uses\` must be a non-empty string (reusable workflow).`,
        );
      }
      continue;
    }

    // `runs-on` is required for runner jobs; reusable-workflow jobs (`uses`)
    // are exempt — the called workflow supplies its own runner.
    const runsOn = /** @type {any} */ (job)["runs-on"];
    const runsOnValid =
      (typeof runsOn === "string" && runsOn.trim() !== "") ||
      (Array.isArray(runsOn) &&
        runsOn.length > 0 &&
        runsOn.every((v) => typeof v === "string")) ||
      (runsOn !== null &&
        typeof runsOn === "object" &&
        !Array.isArray(runsOn) &&
        Object.keys(runsOn).length > 0);
    if (!runsOnValid) {
      found.push(
        `${file}:${lineOf([...jobPath, "runs-on"], jobLine)} — jobs.${name}.\`runs-on\` is missing or not a string, string array, or map.`,
      );
    }

    const steps = /** @type {any} */ (job).steps;
    if (steps === undefined) {
      found.push(
        `${file}:${jobLine} — jobs.${name} has neither \`steps\` (a non-empty array) nor \`uses\`.`,
      );
      continue;
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      found.push(
        `${file}:${lineOf([...jobPath, "steps"], jobLine)} — jobs.${name}.\`steps\` must be a non-empty array.`,
      );
      continue;
    }

    steps.forEach((/** @type {unknown} */ step, /** @type {number} */ index) => {
      const stepPath = [...jobPath, "steps", index];
      const stepLine = lineOf(stepPath, jobLine);
      const label = `jobs.${name}.steps[${index}]`;
      if (step === null || typeof step !== "object" || Array.isArray(step)) {
        found.push(`${file}:${stepLine} — ${label} must be a map.`);
        return;
      }
      const stepMap = /** @type {any} */ (step);
      const hasUses =
        typeof stepMap.uses === "string" && stepMap.uses.trim() !== "";
      const hasRun =
        typeof stepMap.run === "string" && stepMap.run.trim() !== "";
      if (!hasUses && !hasRun) {
        found.push(
          `${file}:${stepLine} — ${label} has neither \`uses\` nor \`run\`.`,
        );
      }
    });
  }

  return found;
}

if (!existsSync(WORKFLOWS_DIR)) {
  reportFindingsAndExit("Workflow script reference check", [
    `no ${path.relative(ROOT, WORKFLOWS_DIR)} directory found`,
  ]);
}

for (const file of readdirSync(WORKFLOWS_DIR)) {
  if (!/\.ya?ml$/.test(file)) continue;
  const text = readFileSync(path.join(WORKFLOWS_DIR, file), "utf8");

  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  if (doc.errors.length > 0) {
    const err = doc.errors[0];
    const line = err.linePos?.[0]?.line ?? 1;
    findings.push(
      `${file}:${line} — workflow does not parse as YAML: ${String(err.message).split("\n")[0]}`,
    );
    continue;
  }
  const workflow = doc.toJS();
  const jobs =
    workflow && typeof workflow === "object" ? workflow.jobs : undefined;
  if (
    !jobs ||
    typeof jobs !== "object" ||
    Array.isArray(jobs) ||
    Object.keys(jobs).length === 0
  ) {
    findings.push(
      `${file}:1 — no job keys found: a workflow must declare a non-empty \`jobs:\` map (signature of a workflow file that lost its workflow content).`,
    );
    continue;
  }

  const structural = validateWorkflowShape(file, doc, lineCounter, workflow, jobs, text);
  if (structural.length > 0) {
    findings.push(...structural);
    continue;
  }

  for (const { lineNo, command } of collectCommandLines(text)) {
    for (const run of parsePnpmInvocations(command)) {
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
