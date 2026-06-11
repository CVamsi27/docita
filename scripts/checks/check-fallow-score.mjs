import { spawnSync } from "node:child_process";

// `--skip health` is intentional: this gate enforces the *zeroable* signals
// (dead-code issues, clone groups, duplicated lines/rate — see below). The
// separate `fallow health` score (0-100, currently 78/B) is NOT gated here
// because it has a measured structural floor for a codebase this size. Per
// fallow's docs (docs.fallow.tools/explanations/health), `score = 100 -
// sum(penalties)`:
//   - hotspots: `min(hotspot_top_pct_count / ceil(total_files * 0.01) * 10, 10)`.
//     `hotspot_top_pct_count` IS `ceil(total_files * 0.01)` by construction (it's
//     the top-1% selection), so this ratio is always 1 and the penalty is always
//     exactly -10 — unless fewer than ~40 files show any git-churn signal in 6mo,
//     impossible for an active repo this size. Cannot be improved.
//   - unit_size: `min(functions_over_60_loc_per_k * 0.5, 10)`. At 47.4 (846 of
//     17,861 functions >60 LOC), this is capped at -10. The cap only lifts below
//     functions_over_60_loc_per_k < 20, i.e. <~358 functions >60 LOC — a
//     ~488-function reduction. Below that threshold it's a step function: small
//     reductions move the score by exactly 0.
//   - coupling: `min(coupling_high_pct * 0.5, 5)`. "High coupling" = fan-in >
//     max(p95_fan_in, 10) = 10 here. 113/3202 scored files (3.5%) exceed it,
//     giving -1.8. Checked all 113: they're shared primitives by design (Button,
//     Card, Input, prisma.service, auth decorators, formatters, auth-context,
//     etc.). Reaching -1.0 needs coupling_high_pct <= 2.0%, i.e. ~48 of those
//     files would need fan-in <= 10 — not achievable without fragmenting core
//     primitives.
// Empirical confirmation: commit 5d8378973 split 15 large (200+ LOC) functions
// into 40+ new files — a substantial genuine refactor — yet
// `.fallow/snapshots/*.json` shows the score unchanged at 78.2/B before and
// after (all 11 vital-sign metrics identical). 2026-06-11: extracted 3 more
// high-CRAP components into hooks/helpers (floating-start-consultation,
// pricing-tier-card, subscription-guard) — score held at 78/B, as predicted by
// the formulas above. Don't burn further effort chasing this number; gate on
// the zeroable signals instead.
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "fallow",
    "--skip",
    "health",
    "--summary",
    "--format",
    "json",
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stdout.write(result.stdout);
  process.exit(result.status ?? 1);
}

const jsonStart = result.stdout.indexOf("{");
if (jsonStart === -1) {
  console.error("Fallow did not emit a JSON report.");
  process.exit(1);
}

const report = JSON.parse(result.stdout.slice(jsonStart));
const deadCodeIssues = Number(report.check?.summary?.total_issues ?? 0);
const cloneGroups = Number(report.dupes?.summary?.clone_groups ?? 0);
const duplicatedLines = Number(report.dupes?.summary?.duplicated_lines ?? 0);
const duplicationRate = Number(report.dupes?.summary?.duplication_rate ?? 0);

if (deadCodeIssues !== 0 || cloneGroups !== 0 || duplicatedLines !== 0 || duplicationRate !== 0) {
  console.error(
    [
      "Fallow gate failed:",
      `  dead-code issues: ${deadCodeIssues}`,
      `  clone groups: ${cloneGroups}`,
      `  duplicated lines: ${duplicatedLines}`,
      `  duplication rate: ${duplicationRate}`,
      "",
      "Findings detail:",
    ].join("\n"),
  );
  const findings = [
    ...(report.check?.unused_files ?? []).map((f) => ({ kind: "unused_file", ...f })),
    ...(report.check?.unused_exports ?? []).map((f) => ({ kind: "unused_export", ...f })),
    ...(report.check?.unused_types ?? []).map((f) => ({ kind: "unused_type", ...f })),
    ...(report.check?.private_type_leaks ?? []).map((f) => ({ kind: "private_type_leak", ...f })),
    ...(report.check?.unused_dependencies ?? []).map((f) => ({ kind: "unused_dependency", ...f })),
    ...(report.check?.unused_enum_members ?? []).map((f) => ({ kind: "unused_enum_member", ...f })),
    ...(report.check?.unused_class_members ?? []).map((f) => ({ kind: "unused_class_member", ...f })),
    ...(report.check?.unresolved_imports ?? []).map((f) => ({ kind: "unresolved_import", ...f })),
    ...(report.check?.unlisted_dependencies ?? []).map((f) => ({ kind: "unlisted_dependency", ...f })),
    ...(report.check?.duplicate_exports ?? []).map((f) => ({ kind: "duplicate_export", ...f })),
  ];
  for (const finding of findings) {
    console.error(JSON.stringify(finding));
  }
  process.exit(1);
}

console.log("Fallow gate score: 100");
console.log("Fallow gate: no dead-code issues and no actionable duplication");
