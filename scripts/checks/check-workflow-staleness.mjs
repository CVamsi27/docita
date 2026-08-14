#!/usr/bin/env node
// Fails when a scheduled workflow has had no run in 7 days — the silent-stop
// class that left scale-api-hours.yml and synthetic-monitoring.yml
// disabled_manually since 2026-07-26 with no run and no alert until a survey
// found it.
//
// Exemption: only workflows documented as deliberately disabled in
// docs/operations/RUNBOOKS.md (RB-14) are exempt, and only while their live
// GitHub state is `disabled_manually`. Re-enabling one (per RB-14
// preconditions) drops the exemption automatically, so unexpected staleness
// stays loud.
//
// Runs in two places so it cannot silently die with a disabled guard:
//   1. .github/workflows/workflow-staleness.yml — daily scheduled run.
//   2. pnpm verify:standard — every PR's Repository Standards job has
//      GITHUB_TOKEN, so even if the guard workflow is itself disabled, the
//      next PR catches staleness.
//
// With no API access (no GITHUB_TOKEN/GH_TOKEN and no gh auth) the check
// skips with a message rather than failing — CI always has a token, so the
// gate still enforces.

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";

// 7 days per the survey finding; +12h grace so a weekly cron whose run lands
// a few minutes late (e.g. container-scan) never false-positives, while a
// genuinely missed weekly run (>7.5 days) still flags.
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_MS = 12 * 60 * 60 * 1000;
const WORKFLOWS_DIR = path.join(process.cwd(), ".github", "workflows");
const API_BASE = "https://api.github.com";

// RB-14: deliberately disabled since 2026-07-26. Exemption applies only while
// the live API state is `disabled_manually` (checked below), so the map stays
// keyed to the recorded disable and self-clears on re-enable.
const DOCUMENTED_DISABLED = new Map([
  ["scale-api-hours.yml", "docs/operations/RUNBOOKS.md RB-14"],
  ["synthetic-monitoring.yml", "docs/operations/RUNBOOKS.md RB-14"],
]);

/** Resolve owner/repo (env in CI, git remote locally). */
function resolveRepo() {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (fromEnv && fromEnv.includes("/")) return fromEnv;
  try {
    const url = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const m = url.match(/(?:github\.com[/:])([^/]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1];
  } catch {
    // No remote — fall through to the skip path below.
  }
  return null;
}

/** Resolve an API token: env first, then local gh auth. */
function resolveToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    return execSync("gh auth token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Minimal YAML probe: a workflow is "scheduled" when its `on:` block has a
 * `schedule:` key at two-space indent followed by cron entries. All current
 * scheduled workflows use exactly this shape (see .github/workflows/*.yml).
 */
function isScheduledWorkflow(source) {
  return /^  schedule:\s*(#.*)?$/m.test(source);
}

async function apiJson(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  const repo = resolveRepo();
  const token = resolveToken();

  if (!repo || !token) {
    process.stdout.write(
      "[workflow-staleness] skipped: no GitHub API access (set GITHUB_TOKEN/GH_TOKEN or auth `gh`). CI always runs this with a token; the gate is still enforced there.\n",
    );
    return;
  }

  let entries;
  try {
    entries = readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
  } catch {
    entries = [];
  }
  if (entries.length === 0) {
    process.stdout.write(
      "[workflow-staleness] skipped: no .github/workflows directory found.\n",
    );
    return;
  }

  // Structural check: documented-disabled entries must still exist as files.
  const findings = [];
  for (const [file, reason] of DOCUMENTED_DISABLED) {
    if (!entries.includes(file)) {
      findings.push(
        `${file} is allowlisted as documented-disabled (${reason}) but no longer exists in .github/workflows — remove it from DOCUMENTED_DISABLED.`,
      );
    }
  }

  // One list call gives id + path + state + created_at for every workflow.
  const list = await apiJson(`${API_BASE}/repos/${repo}/actions/workflows`, token);
  if (!list || !Array.isArray(list.workflows)) {
    process.stdout.write(
      `[workflow-staleness] skipped: could not list workflows for ${repo} (API error). Not failing on a transient/network failure.\n`,
    );
    return;
  }
  const byFile = new Map(list.workflows.map((w) => [path.basename(w.path), w]));

  const now = Date.now();
  let checked = 0;
  let exempted = 0;

  for (const file of entries) {
    const source = readFileSync(path.join(WORKFLOWS_DIR, file), "utf8");
    if (!isScheduledWorkflow(source)) continue;
    checked += 1;

    const meta = byFile.get(file);
    if (!meta) {
      // Present in the repo but not yet in the workflows API — the state of a
      // brand-new workflow in its introducing PR (API lists only merged
      // workflows). Once merged it appears; a deleted workflow also disappears
      // from the local file scan, so this is never a silent blind spot.
      process.stdout.write(
        `[workflow-staleness] ${file}: not yet registered in the workflows API (new in this PR?) — skipping.\n`,
      );
      continue;
    }

    const exempt = DOCUMENTED_DISABLED.has(file);
    if (exempt && meta.state === "disabled_manually") {
      exempted += 1;
      continue; // Documented disable (RB-14); not stale by construction.
    }
    if (exempt && meta.state !== "disabled_manually") {
      // Re-enabled (RB-14 preconditions met) — exemption no longer applies;
      // fall through so staleness is judged normally.
      process.stdout.write(
        `[workflow-staleness] ${file}: no longer disabled_manually (state=${meta.state}) — exemption dropped.\n`,
      );
    }

    const runs = await apiJson(
      `${API_BASE}/repos/${repo}/actions/workflows/${meta.id}/runs?per_page=1`,
      token,
    );
    const lastRun = runs?.workflow_runs?.[0]?.run_started_at;
    if (!lastRun) {
      // Never ran (or API unavailable) — cannot judge staleness; not a miss.
      continue;
    }
    const ageMs = now - Date.parse(lastRun);
    if (ageMs > STALE_MS + GRACE_MS) {
      const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      findings.push(
        `${file} has not run in ${days} days (last run ${lastRun}). If it was deliberately disabled, document it in docs/operations/RUNBOOKS.md (see RB-14) and add it to DOCUMENTED_DISABLED in this script; otherwise re-enable it.`,
      );
    }
  }

  const extraMessage =
    "Scheduled workflows must keep firing. A silently disabled scheduled workflow (like scale-api-hours and synthetic-monitoring, disabled since 2026-07-26) pages nobody and lets failures go unnoticed. Re-enable it, or document an intentional disable in docs/operations/RUNBOOKS.md and allowlist it in this script.";

  // Optional page on findings (same shape as scripts/monitoring/synthetic/probe-lib.mjs).
  const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim();
  if (findings.length > 0 && webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: [
          "[PAGE] Workflow staleness guard",
          `${findings.length} scheduled workflow(s) stale`,
          `source=workflow-staleness`,
        ].join("\n"),
      }),
    }).catch(() => {
      // Non-blocking: the failing run itself is the primary signal.
    });
  }

  if (checked === 0) {
    process.stdout.write(
      "[workflow-staleness] OK (no scheduled workflows found in repo).\n",
    );
    return;
  }

  reportFindingsAndExit("Workflow staleness check", findings, {
    failAlways: true,
    extraMessage,
  });
}

main().catch((error) => {
  process.stderr.write(`[workflow-staleness] error: ${error.message}\n`);
  process.exit(1);
});
